export function generateUUID() {
  return new Promise<string>((resolve, reject) => {
    wx.getRandomValues({
      length: 16,
      success: (res) => {
        const bytes = new Uint8Array(res.randomValues);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;

        const uuid = [...bytes]
          .map((byte, index) => {
            if (index === 4 || index === 6 || index === 8 || index === 10) {
              return "-" + byte.toString(16).padStart(2, "0");
            }
            return byte.toString(16).padStart(2, "0");
          })
          .join("");
        resolve(uuid);
      },
      fail: reject,
    });
  });
}
