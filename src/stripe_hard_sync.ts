import * as stripe_to_airtable from "./stripe_to_airtable"
import * as airtable_utilities from "./airtable_utilities";
import {inspect} from "./utilities";
import Stripe from "stripe";
import Airtable from "airtable";
import Table from "airtable/lib/table";
import * as R from "ramda";
import * as dotenv from "dotenv";
import {readFileSync} from "fs";

const stripe_limit_maximum = 100;
const airtable_base = "";

// environment variables
Object.assign(
    process.env,
    dotenv.parse(readFileSync(".env"))
  );
  if
    (
      process.env.STRIPE_API_KEY === undefined ||
      process.env.AIRTABLE_API_KEY === undefined
    )
    {
      throw new Error("environment variables missing");
    }
  const stripe_api_key: string = process.env.STRIPE_API_KEY;
  const airtable_api_key: string = process.env.AIRTABLE_API_KEY;
  
  // API handles
  const stripe = new Stripe(stripe_api_key, {apiVersion: "2020-08-27"});
  const airtable = new Airtable({apiKey: airtable_api_key}).base(airtable_base);

const hard_sync =
  async (
    stripe_list: (parameters: {limit: number, starting_after?: string}) => Stripe.ApiListPromise<any>,
    stripe_to_airtable_parameter: (from_strip: any) => {[key: string]: string},
    table: Table
  ): Promise<void> =>
  {
    await airtable_utilities.destroy_all(table);
    console.log("Inserting into Airtablew...");
    let objects = (await stripe_list({limit: stripe_limit_maximum})).data;
    let count = 0;
    while (objects.length !== 0) {
      await airtable_utilities.create_all(table, R.map(stripe_to_airtable_parameter, objects), "no log");

      count += objects.length;
      console.log(count + " " + R.last(objects).id);

      objects =
        (await stripe_list({
          limit: stripe_limit_maximum,
          starting_after: R.last(objects).id
        })).data;
    }
  };
