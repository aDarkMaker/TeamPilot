#!/usr/bin/env bash
set -euo pipefail

# Blue-green release driver. Runs on the docker host (server) or locally.
# The traffic switch is the only step that changes what users hit; everything
# before it happens on the idle colour.

DEPLOY_MODE="${DEPLOY_MODE:-remote}"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
SHARED_NETWORK_NAME="${SHARED_NETWORK_NAME:-hxktoolbox_shared}"
BLUE_PORT="${BLUE_PORT:-8080}"
GREEN_PORT="${GREEN_PORT:-8090}"
EDGE_PORT="${EDGE_PORT:-18000}"
RELEASE_TAG="${RELEASE_TAG:-}"
SKIP_BUILD="${SKIP_BUILD:-0}"
DRAIN_SECONDS="${DRAIN_SECONDS:-30}"
# Recruitment traffic keeps serving from the previous stack, so keeping it alive
# is the default; pass --stop-previous once it is safe to reclaim the resources.
STOP_PREVIOUS="${STOP_PREVIOUS:-0}"
NO_CUTOVER="${NO_CUTOVER:-0}"
ROLLBACK="${ROLLBACK:-0}"
SITE_CONF="${SITE_CONF:-/etc/nginx/sites-available/huaxiaoke.work}"
UPSTREAM_CONF="${UPSTREAM_CONF:-/etc/nginx/conf.d/hxktoolbox-upstream.conf}"

STATE_FILE="$PROJECT_DIR/.deploy-state"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"
BASE_COMPOSE_FILE="$PROJECT_DIR/docker-compose.base.yml"
EDGE_COMPOSE_FILE="$PROJECT_DIR/docker-compose.edge.yml"
EDGE_CONF_DIR="$PROJECT_DIR/temp/edge/conf.d"
BASE_PROJECT="hxktoolbox-base"
EDGE_PROJECT="hxktoolbox-edge"
EDGE_CONTAINER="hxktoolbox-edge"

if [ -z "${COMPOSE_BIN:-}" ]; then
	if docker compose version >/dev/null 2>&1; then
		COMPOSE_BIN="docker compose"
	else
		COMPOSE_BIN="docker-compose"
	fi
fi

cd "$PROJECT_DIR"
export SHARED_NETWORK_NAME

log() { printf '\n[deploy] %s\n' "$*"; }
warn() { printf '\n[deploy] WARN: %s\n' "$*" >&2; }
die() { printf '\n[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

# --- state ------------------------------------------------------------------

state_get() {
	if [ -f "$STATE_FILE" ]; then
		sed -n "s/^$1=//p" "$STATE_FILE" | tail -n1
	fi
	return 0
}

write_state() {
	printf 'active=%s\nprevious=%s\nactive_tag=%s\nprevious_tag=%s\nactive_project=%s\nprevious_project=%s\nbootstrapped=1\n' \
		"$1" "$2" "$3" "$4" "$5" "$6" >"$STATE_FILE"
}

color_project() { printf 'hxktoolbox-%s' "$1"; }

other_color() {
	if [ "${1:-}" = "blue" ]; then
		printf 'green'
	else
		printf 'blue'
	fi
}

port_of() {
	case "$1" in
	blue) printf '%s' "$BLUE_PORT" ;;
	green) printf '%s' "$GREEN_PORT" ;;
	*) die "unknown colour: $1" ;;
	esac
}

# --- docker helpers ---------------------------------------------------------

run_project() {
	local project="$1" color="$2" tag="$3"
	shift 3
	RELEASE_TAG="$tag" SERVICE_ROLE="$color" APP_PORT="$(port_of "$color")" \
		$COMPOSE_BIN -p "$project" -f "$COMPOSE_FILE" "$@"
}

stop_project() {
	local project="$1"
	[ -n "$project" ] || return 0
	log "stopping project $project"
	$COMPOSE_BIN -p "$project" -f "$COMPOSE_FILE" down --remove-orphans || warn "failed to stop $project"
}

# The legacy single-stack release runs under its own project name and holds a
# host port, so it has to be recognised before a colour tries to bind it.
port_owner() {
	docker ps --format '{{.Names}}|{{.Ports}}' | grep -F "127.0.0.1:$1->" | cut -d'|' -f1 | head -n1 || true
}

ensure_port_available() {
	local color="$1" project="$2" port owner
	port="$(port_of "$color")"
	owner="$(port_owner "$port")"
	[ -n "$owner" ] || return 0
	case "$owner" in
	"$project"-*) return 0 ;;
	esac
	die "port $port is held by $owner; stop that stack or release the colour before releasing"
}

ensure_shared_network() {
	if docker network inspect "$SHARED_NETWORK_NAME" >/dev/null 2>&1; then
		return 0
	fi
	log "creating external network $SHARED_NETWORK_NAME"
	docker network create "$SHARED_NETWORK_NAME" >/dev/null
}

ensure_base_stack() {
	log "ensuring base redis stack"
	$COMPOSE_BIN -p "$BASE_PROJECT" -f "$BASE_COMPOSE_FILE" up -d
}

wait_healthy() {
	local color="$1" port
	local i
	port="$(port_of "$color")"
	for i in $(seq 1 40); do
		if curl -fsS -m 5 "http://127.0.0.1:$port/api/health" >/dev/null 2>&1; then
			log "$color is healthy on port $port"
			return 0
		fi
		sleep 3
	done
	return 1
}

# --- traffic switch ---------------------------------------------------------

write_host_upstream() {
	local port tmp
	port="$(port_of "$1")"
	tmp="$(mktemp)"
	{
		printf '# Managed by script/deploy.sh, do not edit.\n'
		printf 'upstream hxktoolbox_app {\n'
		printf '    server 127.0.0.1:%s;\n' "$port"
		printf '    keepalive 32;\n'
		printf '}\n'
	} >"$tmp"
	sudo install -m 0644 "$tmp" "$UPSTREAM_CONF"
	rm -f "$tmp"
}

write_edge_upstream() {
	mkdir -p "$EDGE_CONF_DIR"
	if [ ! -f "$EDGE_CONF_DIR/default.conf" ]; then
		cp "$PROJECT_DIR/script/local-edge/default.conf" "$EDGE_CONF_DIR/default.conf"
	fi
	{
		printf 'upstream hxktoolbox_app {\n'
		printf '    server %s:80;\n' "$1"
		printf '    keepalive 32;\n'
		printf '}\n'
	} >"$EDGE_CONF_DIR/upstream.conf"
}

reload_edge() {
	if ! docker ps --format '{{.Names}}' | grep -qx "$EDGE_CONTAINER"; then
		log "starting local edge container"
		EDGE_PORT="$EDGE_PORT" $COMPOSE_BIN -p "$EDGE_PROJECT" -f "$EDGE_COMPOSE_FILE" up -d
	fi
	docker exec "$EDGE_CONTAINER" nginx -t
	docker exec "$EDGE_CONTAINER" nginx -s reload
}

switch_traffic() {
	local color="$1"
	log "switching traffic to $color"
	if [ "$DEPLOY_MODE" = "local" ]; then
		write_edge_upstream "$color"
		reload_edge
	else
		write_host_upstream "$color"
		sudo nginx -t
		sudo nginx -s reload
	fi
}

# --- one-off bootstrap ------------------------------------------------------

# Rewrites the host nginx site so the release stacks own the upstream.
prepare_host_edge() {
	if [ -f "$UPSTREAM_CONF" ]; then
		return 0
	fi
	log 'wiring host nginx to the hxktoolbox_app upstream'
	[ -f "$SITE_CONF" ] || die "host nginx site not found: $SITE_CONF"
	write_host_upstream blue
	sudo cp "$SITE_CONF" "$SITE_CONF.bak.$(date +%Y%m%d%H%M%S)"
	sudo sed -i -E \
		-e 's#proxy_pass http://127\.0\.0\.1:8080;#proxy_pass http://hxktoolbox_app;#' \
		-e 's#client_max_body_size 20m;#client_max_body_size 60m;#' \
		"$SITE_CONF"
	if ! grep -q 'proxy_set_header Connection' "$SITE_CONF"; then
		sudo sed -i -E \
			's#^([[:space:]]*proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;)#\1\n        proxy_set_header Connection "";#' \
			"$SITE_CONF"
	fi
	sudo nginx -t
	sudo nginx -s reload
}

# The first release adopts whatever the old single-stack deploy left running.
adopt_legacy_stack() {
	local tag
	tag="legacy-$(date +%Y%m%d%H%M%S)"
	log 'adopting the running legacy stack as the blue release'
	if docker image inspect hxktoolbox_nginx:latest >/dev/null 2>&1; then
		docker tag hxktoolbox_nginx:latest "hxktoolbox-nginx:$tag"
		docker tag hxktoolbox_backend:latest "hxktoolbox-backend:$tag"
	else
		warn 'legacy images not found, rollback to the legacy release will be unavailable'
		tag=''
	fi
	write_state blue '' "$tag" '' 'hxktoolbox' ''
}

migrate_legacy_cache() {
	docker ps --format '{{.Names}}' | grep -qx 'hxktoolbox_redis_1' || return 0
	local base_id
	base_id="$($COMPOSE_BIN -p "$BASE_PROJECT" -f "$BASE_COMPOSE_FILE" ps -q redis 2>/dev/null || true)"
	[ -n "$base_id" ] || return 0
	if docker exec "$base_id" test -f /data/dump.rdb >/dev/null 2>&1; then
		return 0
	fi
	log 'moving the cached redis dataset into the base stack'
	docker exec hxktoolbox_redis_1 redis-cli SAVE >/dev/null 2>&1 || true
	if docker cp hxktoolbox_redis_1:/data/dump.rdb /tmp/hxktoolbox-dump.rdb >/dev/null 2>&1; then
		docker cp /tmp/hxktoolbox-dump.rdb "$base_id:/data/dump.rdb" >/dev/null 2>&1 || warn 'cache copy failed'
		rm -f /tmp/hxktoolbox-dump.rdb
		docker restart "$base_id" >/dev/null 2>&1 || true
	fi
}

# --- release steps ----------------------------------------------------------

release_stack() {
	local color="$1" tag="$2" project
	project="$(color_project "$color")"

	ensure_port_available "$color" "$project"

	if [ "$SKIP_BUILD" != "1" ]; then
		log "building $color images ($tag)"
		run_project "$project" "$color" "$tag" build
	fi

	log "starting $color stack on port $(port_of "$color")"
	run_project "$project" "$color" "$tag" up -d

	if ! wait_healthy "$color"; then
		warn "$color did not become healthy, discarding it"
		run_project "$project" "$color" "$tag" down --remove-orphans || true
		die 'release aborted, the current release is still serving'
	fi
}

prune_images() {
	local keep="$*" repo tag
	docker image prune -f >/dev/null 2>&1 || true
	for repo in hxktoolbox-backend hxktoolbox-nginx; do
		docker images --format '{{.CreatedAt}}|{{.Tag}}' "$repo" 2>/dev/null |
			grep -v '|<none>' | sort -r | tail -n +6 | cut -d'|' -f2 |
			while read -r tag; do
				case " $keep " in
				*" $tag "*) continue ;;
				esac
				docker rmi "$repo:$tag" >/dev/null 2>&1 || true
			done || true
	done
}

# --- flows ------------------------------------------------------------------

do_release() {
	local active active_tag active_project target tag old_previous_tag
	active="$(state_get active)"
	active_tag="$(state_get active_tag)"
	old_previous_tag="$(state_get previous_tag)"
	active_project="$(state_get active_project)"
	if [ -z "$active" ]; then
		active_project=''
	elif [ -z "$active_project" ]; then
		active_project="$(color_project "$active")"
	fi

	target="$(other_color "$active")"
	tag="$RELEASE_TAG"
	if [ -z "$tag" ]; then
		tag="$(date +%Y%m%d%H%M%S)"
	fi

	if [ "$DEPLOY_MODE" != "local" ]; then
		prepare_host_edge
	fi

	release_stack "$target" "$tag"

	if [ "$NO_CUTOVER" = "1" ]; then
		log "$target is staged on port $(port_of "$target"), traffic untouched"
		return 0
	fi

	switch_traffic "$target"

	# The previous stack keeps serving warm for instant rollback unless asked to stop.
	if [ -n "$active" ]; then
		if [ "$STOP_PREVIOUS" = "1" ]; then
			log "draining $active for ${DRAIN_SECONDS}s before shutdown"
			sleep "$DRAIN_SECONDS"
			stop_project "$active_project"
		else
			log "keeping $active running on port $(port_of "$active") for rollback"
		fi
	else
		log 'no previous release to drain'
	fi

	write_state "$target" "$active" "$tag" "$active_tag" "$(color_project "$target")" "$active_project"
	prune_images "$tag" "$active_tag" "$old_previous_tag"
	log "release $tag is live on $target"
}

do_rollback() {
	local active active_tag active_project target tag target_project target_port
	active="$(state_get active)"
	active_tag="$(state_get active_tag)"
	active_project="$(state_get active_project)"
	target="$(state_get previous)"
	tag="$(state_get previous_tag)"
	target_project="$(state_get previous_project)"

	[ -n "$target" ] || die 'no previous release recorded, nothing to roll back to'
	[ -n "$tag" ] || die "previous release ($target) has no image tag"
	[ -n "$target_project" ] || target_project="$(color_project "$target")"
	target_port="$(port_of "$target")"

	log "rolling back from $active to $target ($tag)"
	# An adopted legacy stack is already running on this port, so probe before starting.
	if ! curl -fsS -m 3 "http://127.0.0.1:$target_port/api/health" >/dev/null 2>&1; then
		ensure_port_available "$target" "$target_project"
		run_project "$target_project" "$target" "$tag" up -d
	fi
	wait_healthy "$target" || die 'the previous release is not healthy, keeping the current one'

	switch_traffic "$target"
	if [ "$STOP_PREVIOUS" = "1" ]; then
		sleep "$DRAIN_SECONDS"
		stop_project "$active_project"
	else
		log "keeping $active running on port $(port_of "$active") for rollback"
	fi

	write_state "$target" "$active" "$tag" "$active_tag" "$target_project" "$active_project"
	log "rollback to $target is live"
}

main() {
	command -v curl >/dev/null 2>&1 || die 'curl is required'
	[ -f "$COMPOSE_FILE" ] || die "compose file not found: $COMPOSE_FILE"
	log "mode=$DEPLOY_MODE tag=${RELEASE_TAG:-auto} rollback=$ROLLBACK cutover=$((1 - NO_CUTOVER)) stop_previous=$STOP_PREVIOUS"

	ensure_shared_network
	ensure_base_stack

	if [ "$ROLLBACK" = "1" ]; then
		do_rollback
		return 0
	fi

	if [ ! -f "$STATE_FILE" ] && [ "$DEPLOY_MODE" != "local" ]; then
		migrate_legacy_cache
		adopt_legacy_stack
	fi

	do_release
}

main "$@"
