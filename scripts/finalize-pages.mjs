// Preserve the source binding in the public artifact produced by Actions.
import { existsSync, copyFileSync } from 'node:fs';
if (existsSync('deployment-source.json')) {
  copyFileSync('deployment-source.json', 'dist/deployment-source.json');
}
