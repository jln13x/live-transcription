"use server";

import { assembly } from "@/server/assembly";

export const getToken = async () => {
  const expires_in = 3600;
  const token = await assembly.realtime.createTemporaryToken({ expires_in });

  return {
    expires_in,
    token,
  };
};
