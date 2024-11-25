import { SacEvent } from "./SacEvent";
import { Server } from "./Server";

/**
 * 多量の文字列を送受信する場合に利用する\
 * sendとwaitで同じ`key`を指定する必要がある
 *
 * @example
 * 生主から各プレイヤーに送信する
 * // Server
 * ShareBigText.waitingFromSingleUser("key", g.game.env.hostId, () => true);
 * // Client
 * if (g.game.env.isHost) {
 *   ShareBigText.send("key", shareText, () => { 送信完了時のイベント });
 * } else {
 *   ShareBigText.waitingFromSingleUser(
 *     "key",
 *     g.game.env.hostId,
 *     text => {
 *       shareText = text;
 *       console.log(`CLIENT: received`);
 *       return true; // true を返すことでこれ以上の受信を行わない
 *     }
 *   );
 * }
 *
 * @example
 * 各プレイヤーがサーバーに送信する
 * // Server
 * const finishWaitText = ShareBigText.waitingFromMultiUser(
 *   "key",
 *   (playerId, text) => {
 *     // textMap: Map<string, string>
 *     const textMap = new Map<string, string>();
 *     textMap.set(playerId, text);
 *   },
 *   false  // サーバーからクライアントには送信しないのでfalseを指定する
 * );
 * // Client
 * ShareBigText.send("key", anyText);
 */
export const ShareBigText = {
  state: {
    /**
     * 1回で送る文字数\
     * 初期値は`1000 * 30`
     * 
     * base64なら 1byte/1文字 1KB/1000文字
     */
    chunkSize: 1000 * 30,
    /** 1つ送るごとに待機するTick数 */
    waitFrame: 3,
  },

  /**
   * テキストを送信する
   * @param key 識別キー
   * @param text テキスト
   * @param complated 全テキストを送信し終えたら呼ばれる
   */
  send: (key: string, text: string, complated?: () => void): void => {
    const scene = g.game.env.scene;
    let shareIndex = 0;
    // let waitCount = ShareBigText.state.waitFrame;

    const share = () => {
      const chunk = text.substring(shareIndex, shareIndex += ShareBigText.state.chunkSize);
      const last = shareIndex >= text.length;
      const textChunk = new TextChunk(key, chunk, last);

      g.game.env.hasClient
        ? g.game.env.client.sendEvent(textChunk)
        : g.game.env.server.broadcast(textChunk);

      if (last) {
        scene.onUpdate.remove(share);
        complated?.();
      }
    };

    scene.onUpdate.add(share);
  },
  /**
   * テキストを受信する (特定の１人のユーザーから受信する)\
   * サーバーが送り返さない場合は `toClient=false` にする
   * @param key 識別キー
   * @param playerId 送信者ID
   * @param complate 全文を受信する度に呼び出される. `true` を返すと待受を終了する関数が実行されます
   * @param toClient クライアントが受信するか `default:true`
   * @returns 待受を終了する関数
   */
  waitingFromSingleUser: (
    key: string,
    playerId: string,
    complate: (text: string) => boolean | void,
    toClient: boolean = true,
  ): () => void => {
    let saveText = "";
    const eventSet = TextChunk.createEventSet(event => {
      if (event.key !== key || event.playerId !== playerId) return;

      saveText += event.chunk;

      // クライアントが受信する場合はブロードキャストする
      if (toClient && g.game.env.hasServer) {
        g.game.env.server.broadcast(event);
      }

      if (event.last) {
        if (complate(saveText)) finishWait();
      }
    });

    let removeKeyClient: number;
    let removeKeyServer: number;
    if (g.game.env.hasClient) removeKeyClient = g.game.env.client.addEventSet(eventSet);
    if (g.game.env.hasServer) removeKeyServer = g.game.env.server.addEventSet(eventSet);


    let isFinished = false;

    // 待受を終了する関数
    const finishWait = () => {
      if (isFinished) return;
      if (g.game.env.hasClient) g.game.env.client.removeEventSet(removeKeyClient);
      if (g.game.env.hasServer) g.game.env.server.removeEventSet(removeKeyServer);
      isFinished = true;
    };

    return finishWait;
  },
  /**
   * テキストを受信する (複数のユーザーから受信する)\
   * サーバーが送り返さない場合は `toClient=false` にする
   * @param key 識別キー
   * @param complate 全文を受信する度に呼び出される. `true` を返すと待受を終了する関数が実行されます
   * @param toClient クライアントが受信するか `default:true`
   * @returns 待受を終了する関数
   */
  waitingFromMultiUser: (
    key: string,
    complate: (playerId: string, text: string) => boolean | void,
    toClient: boolean = true,
  ): () => void => {
    const map = new Map<string, string>();

    const eventSet = TextChunk.createEventSet(event => {
      if (event.key !== key) return;

      let saveText = map.get(event.key);
      if (saveText == null) {
        saveText = "";
        map.set(event.key, saveText);
      }

      saveText += event.chunk;

      // クライアントが受信する場合はブロードキャストする
      if (toClient && g.game.env.hasServer) {
        g.game.env.server.broadcast(event);
      }

      if (event.last) {
        if (complate(event.playerId!, saveText)) finishWait();
      }
    });

    let removeKeyClient: number;
    let removeKeyServer: number;
    if (g.game.env.hasClient) removeKeyClient = g.game.env.client.addEventSet(eventSet);
    if (g.game.env.hasServer) removeKeyServer = g.game.env.server.addEventSet(eventSet);

    let isFinished = false;

    // 待受を終了する関数
    const finishWait = () => {
      if (isFinished) return;
      if (g.game.env.hasClient) g.game.env.client.removeEventSet(removeKeyClient);
      if (g.game.env.hasServer) g.game.env.server.removeEventSet(removeKeyServer);
      isFinished = true;
    };

    return finishWait;
  },
  /**
   * サーバーがブロードキャストする場合に、サーバーでこの関数を予め呼んでおく
   * @param server
   * @param key 識別キー
   * @deprecated
   */
  resendBroadcast: (server: Server, key: string): void => {
    if (!g.game.env.hasServer || g.game.env.gameType === "solo") return;

    const removeKey = server.addEventSet(TextChunk.createEventSet(event => {
      if (event.key !== key) return;

      server.broadcast(event);

      if (event.last) {
        server.removeEventSet(removeKey);
      }
    }));
  },
} as const;

class TextChunk extends SacEvent {
  constructor(
    public readonly key: string,
    public readonly chunk: string,
    public readonly last: boolean,
  ) { super(); }
}
