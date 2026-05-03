import type { Context } from 'koa';
import type { SearchService } from '../services/search.service';

export class SearchController {
	constructor(private service: SearchService) {}

	search = async (ctx: Context) => {
		const result = await this.service.search(ctx.query, ctx.state.user!.id);
		ctx.body = { ok: true, data: result };
	};
}
