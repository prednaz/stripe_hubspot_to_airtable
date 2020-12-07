import Table from "airtable/lib/table";
import AirtableRecord from "airtable/lib/record";
import * as R from "ramda";

export const find_id =
  async (table: Table, key: string, value: any): Promise<string | null> =>
  {
    const response = await table.select({
      maxRecords: 1,
      fields: [key], // [] would transfer all fields for reasons
      filterByFormula: `${key} = '${value}'`
    }).firstPage();
    return response.length !== 0 ? response[0].id : null;
  };

export const update_or_create =
  async (table: Table, key: string, object: Record<string, any>): Promise<void> =>
  {
    const airtable_id = await find_id(table, key, object[key]);
    if (airtable_id === null) {
      await table.create([{fields: object}]);
    }
    else {
      await table.update([{id: airtable_id, fields: object}]);
    }
  };

export const destroy_all =
  async (table: Table): Promise<void> =>
  {
    console.log("Deleting from Airtable...");
    const sample = await table.select({maxRecords: 1}).firstPage();
    if (sample.length === 0) {
      return;
    }
    const field = R.keys(sample[0].fields)[0] as string;
    let count = 0;
    while (true) {
      const page: readonly AirtableRecord[] = await table.select({fields: [field]}).firstPage();
      if (page.length === 0) {
        break;
      }
      for (const records10 of R.splitEvery(10, R.map(record => record.id, page))) {
        await table.destroy(records10);
      }
      count += page.length;
      if (count % 200 === 0) {
        console.log(count);
      }
    }
    console.log(count);
  };

export const create_all =
  async (table: Table, objects: ReadonlyArray<Record<string, any>>, log: "log" | "no log"): Promise<void> =>
  {
    if (log === "log") {
      console.log("Inserting into Airtablew...");
    }
    let count = 0;
    for (const objects10 of R.splitEvery(10, objects)) {
      await table.create(R.map(object => ({fields: object}), objects10));
      if (log === "log") {
        count += objects10.length;
        if (count % 200 === 0) {
          console.log(count);
        }
      }
    };
    if (log === "log") {
      console.log(count);
    }
  };
