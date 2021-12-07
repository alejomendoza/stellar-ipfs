export type NFTPayload = {
  name: string;
  description: string;
  code: string;
  issuer?: string;
  domain: string;
  image: {
    fileName: string;
    data: Buffer;
    type: "image/jpeg" | "image/png";
  };
  video: {
    fileName: string;
    data: Buffer;
    type: "video/mp4";
  };
  supply: number;
};

export type NFTMetadata = {
  name: string;
  description: string;
  code: string;
  issuer: string;
  domain: string;
  image: string;
  video: string;
  supply: number;
  ipnft: string;
};
