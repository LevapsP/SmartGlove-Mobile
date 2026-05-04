import { CONFIG } from '../config';

const RESET = '\x1b[0m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

function timestamp() {
  return new Date().toISOString().substr(11, 8);
}

export const logger = {
  debug(tag: string, msg: string, data?: any) {
    if (!CONFIG.DEBUG) return;
    console.log(`${CYAN}[${timestamp()}][DBG][${tag}] ${msg}${RESET}`, data ?? '');
  },

  info(tag: string, msg: string, data?: any) {
    console.log(`${GREEN}[${timestamp()}][INF][${tag}] ${msg}${RESET}`, data ?? '');
  },

  warn(tag: string, msg: string, data?: any) {
    console.warn(`${YELLOW}[${timestamp()}][WRN][${tag}] ${msg}${RESET}`, data ?? '');
  },

  error(tag: string, msg: string, data?: any) {
    console.error(`${RED}[${timestamp()}][ERR][${tag}] ${msg}${RESET}`, data ?? '');
  },
};