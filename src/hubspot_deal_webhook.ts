import {normalize_deal, deal_normalizers, deal_properties} from "./hubspot_to_airtable";
import * as airtable_utilities from "./airtable_utilities";
import {inspect} from "./utilities";
import * as hubspot_library from "@hubspot/api-client";
import Airtable from "airtable";
import express from "express";
import * as R from "ramda";

const airtable_base = "";
const airtable_table = "";
const signature_header = "X-HubSpot-Signature";
const signature_version_header = "X-HubSpot-Signature-Version";

type Event =
  {objectId: number, subscriptionType: "deal.creation" | "deal.deletion"} |
  {objectId: number, subscriptionType: "deal.propertyChange", propertyName: string, propertyValue: string};

export const handlers =
  (
    hubspot: hubspot_library.Client,
    hubspot_client_secret: string,
    airtable: Airtable,
    domain: string,
    port: string
  ):
  {
    verify_signature: (request: express.Request, response: express.Response, buffer: Buffer, encoding: BufferEncoding) => void,
    webhook_handler: (request: express.Request, response: express.Response) => void
  } =>
  {
    const table = airtable.base(airtable_base)(airtable_table);
    
    const process_events =
      async (events: ReadonlyArray<Event>, object_id: string): Promise<void> =>
      {
        const airtable_id = await airtable_utilities.find_id(table, "hs_object_id", object_id);
        if (R.any((event: Event): boolean => event.subscriptionType === "deal.creation", events)) {
          // look up object_id in hubspot and push it to airtable
          const deal = normalize_deal((await hubspot.crm.deals.basicApi.getById(object_id, deal_properties)).body.properties);
          if (airtable_id === null) {
            await table.create([{fields: deal}]);
          }
          else {
            await table.update([{id: airtable_id, fields: deal}]);
          }
        }
        else if (R.any((event: Event): boolean => event.subscriptionType === "deal.deletion", events)) {
          // destroy object_id in airtable
          if (airtable_id !== null) {
            await table.destroy([airtable_id]);
          }
        }
        else if (R.all((event: Event): boolean => event.subscriptionType === "deal.propertyChange", events)) {
          // update object_id in airtable
          if (airtable_id !== null) {
            const field_updates =
            (R.compose as any)(
              R.fromPairs,
              R.map(
                ({propertyName, propertyValue}: {propertyName: string, propertyValue: string}): readonly [string, any] =>
                [propertyName, deal_normalizers[propertyName](propertyValue)]
              ),
              R.filter(({propertyName}: {propertyName: string}) => R.includes(propertyName, R.keys(deal_normalizers)))
            )
              (events);
            await table.update([{id: airtable_id, fields: field_updates}]);
          }
        }
        else {
          console.log("unknown event type:");
          inspect(events);
        }
      };
  
    const verify_signature =
      (
        request: express.Request,
        response: express.Response,
        buffer: Buffer,
        encoding: BufferEncoding
      ): void =>
      {
        try {
          if (
            hubspot.webhooks.validateSignature(
              request.header(signature_header) ?? "",
              hubspot_client_secret,
              buffer.toString(encoding),
              request.header(signature_version_header),
              `${domain}:${port}${request.originalUrl}`,
              request.method
            )
          ) {
            return;
          }
        }
        catch (e) {
          inspect(e);
        }
        throw new Error('unauthorized webhook or error with request processing');
      };
  
    const process_events_safe =
      (events: ReadonlyArray<Event>, object_id: string): void =>
      {process_events(events, object_id).catch(inspect);};
  
    const webhook_handler =
      (request: express.Request, response: express.Response): void =>
      {    
        // Return a response to acknowledge receipt of the event
        response.sendStatus(200);
        R.compose(
          (R.forEachObjIndexed as any)(process_events_safe),
          R.groupBy((event: Event): string => event.objectId.toString())
        )
          (request.body);
      };
    return {verify_signature, webhook_handler};
  };
