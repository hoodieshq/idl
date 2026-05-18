import { describe, expect, it } from 'vitest';

import {
    IDL_FALLBACK_PMP_AUTHORITY,
    buildPmpIdlLookups,
} from '../../src/pmp-idl.js';
import { findPmpMetadataPda } from '../../src/program-metadata.js';
import type { Address } from '@solana/kit';

const PROGRAM = 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya' as Address;
const SEED = 'idl';

describe('buildPmpIdlLookups', () => {
    it('returns canonical + fndn fallback when no authority is provided', async () => {
        const lookups = await buildPmpIdlLookups(PROGRAM, SEED);

        expect(lookups).toHaveLength(2);
        expect(lookups[0]!.authority).toBeNull();
        expect(lookups[1]!.authority).toBe(IDL_FALLBACK_PMP_AUTHORITY);

        const canonical = await findPmpMetadataPda(PROGRAM, SEED, null);
        const fallback = await findPmpMetadataPda(
            PROGRAM,
            SEED,
            IDL_FALLBACK_PMP_AUTHORITY,
        );

        expect(lookups[0]!.address).toBe(canonical);
        expect(lookups[1]!.address).toBe(fallback);
        expect(lookups[0]!.address).not.toBe(lookups[1]!.address);
    });

    it('returns only canonical when authority is explicitly null', async () => {
        const lookups = await buildPmpIdlLookups(PROGRAM, SEED, null);
        expect(lookups).toHaveLength(1);
        expect(lookups[0]!.authority).toBeNull();
    });

    it('returns only the explicit authority lookup when provided', async () => {
        const explicit =
            'fndnu15PLXELbLsTqrfbiweBvsBj2o12RoVfkeCCbX2' as Address;
        const lookups = await buildPmpIdlLookups(PROGRAM, SEED, explicit);
        expect(lookups).toHaveLength(1);
        expect(lookups[0]!.authority).toBe(explicit);
        expect(lookups[0]!.address).toBe(
            await findPmpMetadataPda(PROGRAM, SEED, explicit),
        );
    });

    it('IDL_FALLBACK_PMP_AUTHORITY is fndnu15…', () => {
        expect(IDL_FALLBACK_PMP_AUTHORITY).toBe(
            'fndnu15PLXELbLsTqrfbiweBvsBj2o12RoVfkeCCbX2',
        );
    });
});
