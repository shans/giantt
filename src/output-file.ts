import {writeFileSync} from "fs";

export function writeHTML(filename: string, html: string) {
  writeFileSync(filename, html);
}
