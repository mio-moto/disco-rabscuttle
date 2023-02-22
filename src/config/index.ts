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
  usernames: string[];
  brainFile: string;
  userId?: string;
  steamApiKey: string;
  finnhubApiKey: string;
  uploadConfig: UploadConfig;
  administrators: string[]
}

function loadConfig(path: string): Config {
  return JSON.parse(readFileSync(path, 'utf-8')) as Config;
}

export default () => loadConfig('data/config.json');
