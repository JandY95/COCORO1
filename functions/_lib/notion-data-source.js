const cache = new Map();

export async function getDataSourceId(notion, env) {
  const explicit = String(env.NOTION_DATA_SOURCE_ID || "").trim();
  if (explicit) return explicit;

  const databaseId = String(env.NOTION_DATABASE_ID || "").trim();
  if (!databaseId) {
    throw new Error("Missing NOTION_DATABASE_ID");
  }

  if (cache.has(databaseId)) return cache.get(databaseId);

  const db = await notion.databases.retrieve({ database_id: databaseId });
  const dataSourceId = db?.data_sources?.[0]?.id;

  if (!dataSourceId) {
    throw new Error("No data source found under the Notion database");
  }

  cache.set(databaseId, dataSourceId);
  return dataSourceId;
}
