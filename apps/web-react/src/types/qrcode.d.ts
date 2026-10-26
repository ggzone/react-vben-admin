/**
 * qrcode 模块类型声明（qrcode@1.5.4 无官方类型包，@types/qrcode 与当前依赖版本存在 peer 冲突，
 * 故按运行时实际使用的 API 手写最小声明）
 */
declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;

  export function toString(
    text: string,
    options?: QRCodeToDataURLOptions,
  ): Promise<string>;

  const QRCode: {
    toDataURL: typeof toDataURL;
    toString: typeof toString;
  };

  export default QRCode;
}
