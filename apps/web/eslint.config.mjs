import {defineConfig,globalIgnores} from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
export default defineConfig([...next,globalIgnores(['.next/**','public/cores/**']),{rules:{'@next/next/no-html-link-for-pages':'off','react-hooks/set-state-in-effect':'off','react-hooks/refs':'off'}}]);
