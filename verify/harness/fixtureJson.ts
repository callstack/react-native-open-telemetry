const NUMS = ['NaN', 'Infinity', '-Infinity', '-0'] as const;

/** JSON with NaN, Infinity, -Infinity and -0 as {"$num": "<name>"}. */
export const encodeFixture = (value: unknown): string =>
  JSON.stringify(
    value,
    (_k, v) =>
      typeof v !== 'number'
        ? v
        : Object.is(v, -0)
          ? {$num: '-0'}
          : Number.isFinite(v)
            ? v
            : {$num: String(v)},
    2,
  );

export const decodeFixture = (json: string): unknown =>
  JSON.parse(json, (_k, v) =>
    v && typeof v === 'object' && Object.keys(v).length === 1 && NUMS.includes(v.$num)
      ? Number(v.$num)
      : v,
  );
