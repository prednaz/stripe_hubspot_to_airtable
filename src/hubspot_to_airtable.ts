import * as R from "ramda";

export const deal_properties: Array<string> =
  [
  ];

export type Deal =
  {
  };

export const normalize_string_safe =
  (text: string | null | undefined): string | null =>
  text !== "" && text !== null && text !== undefined ? text : null;

export const process_string_safe =
  <T>(process: (text: string) => T): ((text: string | null | undefined) => T | null) =>
  (text: string | null | undefined): T | null =>
  {
    const normalized_safe = normalize_string_safe(text);
    return normalized_safe !== null ? process(normalized_safe) : null;
  };

export const string_to_timestamp =
  (text: string): number =>
  /\D/.test(text) ? Date.parse(text) : Number.parseInt(text);

export const string_to_timestamp_safe: (text: string | null | undefined) => number | null =
  process_string_safe(string_to_timestamp);

export const deal_normalizers: any =
  {
  };

export const normalize_deal =
  (deal: Record<string, string>): Deal =>
  (
    R.mapObjIndexed(
      (normalizer: (p: unknown) => unknown, property: string) => normalizer(deal[property]),
      deal_normalizers
    ) as Deal
  );
