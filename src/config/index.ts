import {readFileSync} from 'fs';
import {ClientStatus} from '../activity';

export interface UploadConfig {
  formField: string;
  token: string;
  endpoint: string;
  uriFormat: string;
}

export interface Config {
  token: string;
  status: ClientStatus[];
  brainFile: string;
  userId?: string;
  steamApiKey: string;
  alphaVantageKey: string;
  uploadConfig: UploadConfig;
}

function loadConfig(path: string): Config {
  return JSON.parse(readFileSync(path, 'utf-8')) as Config;
}

export default () => loadConfig('data/config.json');
