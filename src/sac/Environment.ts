import { DIContainer } from "../impl/DIContainer";
import { SacClient } from "./SacClient";
import { SacServer } from "./SacServer";

/**
 * 全環境共通の状態
 */
export interface SacDefaultEnv {
  /** ゲームの主催者 (ニコ生なら生主) のID */
  readonly hostId: string;
  /** 現在表示されているシーン */
  readonly scene: g.Scene;
  /** この端末のプレイヤーがゲームの起動者 (生主) かどうか */
  readonly isHost: boolean;
  /**
   * ゲームのタイプ\
   * `multi`: マルチ\
   * `solo` : ランキング
   */
  readonly gameType: "multi" | "solo";
}

/**
 * サーバー環境の状態
 */
export interface SacServerEnvState {
  /** `SacServer`インスタンス */
  readonly server: SacServer;
  readonly serverDI: DIContainer;
}

/**
 * クライアント環境の状態
 */
export interface SacClientEnvState {
  /** `SacClient`インスタンス */
  readonly client: SacClient;
  readonly clientDI: DIContainer;
  /** ゲームが描画されるキャンバス */
  readonly canvas: HTMLCanvasElement;
  /** ゲームが描画されるキャンバスのコンテキスト */
  readonly context: CanvasRenderingContext2D;
  /**
   * 操作イベントを登録する対象の要素\
   * `g.game.operationPluginManager`の持っている`viewInfo`の値
   */
  readonly view: HTMLElement;
}

/** クライアント環境 */
export type SacServerEnv = SacDefaultEnv & ({ hasClient: false; hasServer: true; } & SacServerEnvState);
/** クライアント環境 */
export type SacClientEnv = SacDefaultEnv & ({ hasClient: true; hasServer: false; } & SacClientEnvState);
/** サーバー&クライアント環境 */
export type SacAnyEnv = SacDefaultEnv & ({ hasClient: true; hasServer: true; } & SacServerEnvState & SacClientEnvState);

/** 環境情報 */
export type SacEnv = SacServerEnv | SacClientEnv | SacAnyEnv;

export interface EnvParam {
  /**
   * ゲーム主催者 (ニコ生上なら生主) のID\
   * アツマールソロならプレイヤーのIDが入る
   */
  hostId: string;
  scene: g.Scene;
}

/**
 * 環境変数を部分的に初期化します\
 * 完全に初期化するには戻り値の関数を実行します
 * @returns 環境変数を完全に初期化する関数
 */
export function partialInitEnv(): ((param: EnvParam) => void) {
  let hasServer = false;
  let hasClient = false;
  let gameType: SacEnv["gameType"];
  const context: CanvasRenderingContext2D = (<any>g.game.renderers[0]).canvasRenderingContext2D;

  if (context == null) {
    hasServer = true;
    gameType = "multi";
  } else {
    // https://stackoverflow.com/questions/15631991/how-to-register-onkeydown-event-for-html5-canvas
    context.canvas.tabIndex = 0;
    context.canvas.style.outline = "none";
    hasClient = true;

    // g.game.isActiveInstance() サーバーかどうか
    if (g.game.isActiveInstance()) {
      hasServer = true;
      gameType = "solo";
    } else {
      hasServer = false;
      gameType = "multi";
    }
  }

  const defaultEnv: SacDefaultEnv = {
    hostId: null!,
    scene: null!,
    isHost: null!,
    gameType,
  };

  if (hasServer && hasClient) {
    g.game.env = {
      ...defaultEnv,
      hasServer: true,
      server: null!,
      serverDI: new DIContainer(),
      hasClient: true,
      clientDI: new DIContainer(),
      client: null!,
      canvas: document.getElementsByTagName("canvas")[0],
      context,
      view: (<any>g.game.operationPluginManager)._viewInfo.view as HTMLElement,
    };
  } else if (hasServer) {
    g.game.env = {
      ...defaultEnv,
      hasServer: true,
      server: null!,
      serverDI: new DIContainer(),
      hasClient: false,
    };
  } else /* if (hasClient) */ {
    g.game.env = {
      ...defaultEnv,
      hasServer: false,
      hasClient: true,
      client: null!,
      clientDI: new DIContainer(),
      canvas: document.getElementsByTagName("canvas")[0],
      context,
      view: (<any>g.game.operationPluginManager)._viewInfo.view as HTMLElement,
    };
  }

  {
    const customEnv = { get: () => g.game.env };
    Object.defineProperty(g.game, "clientEnv", customEnv);
    Object.defineProperty(g.game, "serverEnv", customEnv);
  }

  return param => {
    const env = g.game.env as UnReadonly<SacEnv>;
    env.hostId = param.hostId;
    env.scene = param.scene;
    env.isHost = param.hostId === g.game.selfId;

    if (env.hasServer) {
      env.server = new SacServer();
    }

    if (env.hasClient) {
      env.client = new SacClient(param.scene);
    }
  };
}

type UnReadonly<T> = { -readonly [K in keyof T]: T[K] };
