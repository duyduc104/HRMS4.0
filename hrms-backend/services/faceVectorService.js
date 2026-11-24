class FaceVectorService {
  // Ham nay dung de tinh toan khoang cach Euclid giua 2 vector dac trung khuon mat 128 chieu
  // Giai thich code khong thuan:
  // - Kiem tra do dai 2 vector phai bang nhau (chuan 128 float values)
  // - Thuat toan: d = sqrt( sum( (vec1[i] - vec2[i]) ^ 2 ) )
  // - Gia tri khoang cach cang nho chung to dac diem khuon mat cang giong nhau
  static calculateEuclideanDistance(vec1, vec2) {
    if (!vec1 || !vec2 || vec1.length !== vec2.length) {
      throw new Error('Độ dài vector không khớp hoặc rỗng.');
    }
    let sum = 0;
    for (let i = 0; i < vec1.length; i++) {
      sum += Math.pow(vec1[i] - vec2[i], 2);
    }
    return Math.sqrt(sum);
  }

  // Ham nay dung de so sanh va ket luan 2 khuon mat co thuoc ve cung mot nguoi hay khong
  // Giai thich code khong thuan:
  // - threshold 0.60 la nguong tieu chuan vang cua mo hinh face-api.js (Face Recognition ResNet-34)
  // - Neu khoang cach <= threshold thi xac nhan nhan dien dung nguoi do (do tin cay > 99%)
  static compareFace(vec1, vec2, threshold = 0.60) {
    const distance = this.calculateEuclideanDistance(vec1, vec2);
    console.log(`[FaceVectorService] Calculated distance: ${distance} (threshold: ${threshold})`);
    return distance <= threshold;
  }
}
module.exports = FaceVectorService;
