import { SacEvent } from "./SacEvent";

/**
 * サーバーでエラーが起きた時に送信するイベント
 */
export class ServerError extends SacEvent implements Error {
  constructor(
    public readonly name: string,
    public readonly message: string,
    public readonly stack?: string
  ) {
    super();
  }
}
