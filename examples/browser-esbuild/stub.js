// Empty stub for @iarna/toml (and yaml in newer program-metadata). Those parsers
// handle TOML/YAML metadata formats, which IDLs never use — but their static
// imports drag node:stream into the browser bundle. Aliasing them here keeps the
// bundle node-free. If a non-JSON metadata path were ever hit, this throws
// loudly instead of silently misbehaving.
const notAvailable = () => {
    throw new Error('TOML/YAML parsing is not available in this browser build of @solana/idl');
};

export const parse = notAvailable;
export const stringify = notAvailable;
export default { parse, stringify };
