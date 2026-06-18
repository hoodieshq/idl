import { describe, expect, test } from 'vitest';

import { getDiscriminators } from '../src/anchor.js';

// anchor.ts derives these at runtime from their instruction names via WebCrypto
// sha256. These golden bytes pin Anchor's frozen wire format, so the derivation
// is asserted to produce the exact known values — catching a wrong preimage, a
// missing little-endian reverse, or a broken digest path.
const EXPECTED_IDL_IX_TAG = [64, 244, 188, 120, 167, 233, 105, 10];
const EXPECTED_GLOBAL: Record<string, number[]> = {
    close: [98, 165, 201, 177, 108, 65, 206, 96],
    createBuffer: [175, 76, 101, 74, 224, 249, 104, 170],
    idlClose: [49, 69, 34, 50, 56, 170, 112, 220],
    idlCreateBuffer: [251, 116, 234, 204, 49, 233, 132, 93],
    idlSetAuthority: [181, 181, 215, 249, 242, 0, 128, 65],
    idlSetBuffer: [177, 81, 27, 80, 203, 97, 239, 10],
    idlWrite: [136, 138, 108, 118, 46, 146, 6, 111],
    setAuthority: [133, 250, 37, 21, 110, 163, 26, 121],
    setBuffer: [13, 212, 241, 0, 78, 93, 17, 51],
    write: [235, 116, 91, 200, 206, 170, 144, 120],
};

describe('Anchor discriminators (WebCrypto-derived)', () => {
    test('IDL_IX_TAG is sha256("anchor:idl")[:8] reversed (little-endian)', async () => {
        const { idlIxTag } = await getDiscriminators();
        expect([...idlIxTag]).toEqual(EXPECTED_IDL_IX_TAG);
    });

    test.each(Object.entries(EXPECTED_GLOBAL))('GLOBAL_DISCS.%s = sha256("global:...")[:8]', async (key, bytes) => {
        const { global } = await getDiscriminators();
        expect([...global[key as keyof typeof global]]).toEqual(bytes);
    });

    test('memoizes: repeated calls return the same instance', async () => {
        expect(await getDiscriminators()).toBe(await getDiscriminators());
    });
});
