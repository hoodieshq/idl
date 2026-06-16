// Minimal vanilla-TS browser self-test shared by every bundler example.
// Runs @solana/idl's pure (no-network) WebCrypto path in the browser and checks
// the results against values computed in Node. If the package weren't isomorphic
// — or the bundler recipe were wrong — this would throw or mismatch.
import { buildPmpIdlLookups, findAnchorIdlAddress, findPmpMetadataAddress } from '@solana/idl';
import { address } from '@solana/kit';

const PROGRAM = address('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4');
const GOLDEN = {
    anchorIdlPda: 'C88XWfp26heEmDkmfSzeXP7Fd7GQJ2j9dDTUsyiZbUTa',
    lookupCount: 2,
    pmpPda: 'FDDfotwLyeLhUQ62ugzgTjwTvF3r64tPRVsKwsqRrbbC',
};

function line(msg: string): void {
    const pre = document.getElementById('out');
    if (pre) pre.textContent += msg + '\n';
    console.log(msg);
}

async function main(): Promise<void> {
    try {
        line('crypto.subtle.digest: ' + typeof crypto.subtle?.digest);
        line('DecompressionStream: ' + typeof DecompressionStream);
        line('');

        const anchorIdlPda = await findAnchorIdlAddress(PROGRAM);
        const pmpPda = await findPmpMetadataAddress(PROGRAM, 'idl', null);
        const lookupCount = (await buildPmpIdlLookups(PROGRAM, 'idl')).length;

        let ok = true;
        for (const [name, got, want] of [
            ['anchorIdlPda', anchorIdlPda, GOLDEN.anchorIdlPda],
            ['pmpPda', pmpPda, GOLDEN.pmpPda],
            ['lookupCount', String(lookupCount), String(GOLDEN.lookupCount)],
        ] as const) {
            const pass = got === want;
            ok &&= pass;
            line(`${pass ? '✓' : '✗'} ${name}: ${got}`);
        }

        line('');
        line(ok ? 'RESULT: PASS' : 'RESULT: FAIL');
        document.body.dataset.result = ok ? 'PASS' : 'FAIL';
    } catch (err) {
        line('RESULT: ERROR — ' + String(err));
        document.body.dataset.result = 'ERROR';
    }
}

void main();
