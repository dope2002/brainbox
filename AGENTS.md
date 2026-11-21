# 奇有此理工程约定

在本目录接手开发时，先读[迭代交接](docs/HANDOFF.md)，再打开本次任务对应的[产品与技术规格](PRODUCT_AND_TECH_SPEC.md)章节。交接记录描述最近一次核验的进度，代码、配置和测试结果用于确认当前状态。用户指定了本次任务时，优先处理该任务。

- 首次开发和中途接手共用[开发与验收指南](docs/DEVELOPMENT.md)。先检查已有实现和未完成的修改，接续可运行的最小步骤。
- 微信小游戏与旧小程序原型的入口分开。业务 API、题型协议、曝光口径和版本兼容约束以主规格为准。变更已确定的行为时同步修订对应章节、实现和验收案例。
- 完成一个可验收成果或暂停前更新交接记录，留下实际运行的命令、结果、未验收项和下一步。环境变量只记录名称和用途。

<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->
