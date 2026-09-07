class FaceVectorService {
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

  // threshold 0.60 là mức tiêu chuẩn cho nhiều model AI (như face-api.js)
  static compareFace(vec1, vec2, threshold = 0.60) {
    const distance = this.calculateEuclideanDistance(vec1, vec2);
    console.log(`[FaceVectorService] Calculated distance: ${distance} (threshold: ${threshold})`);
    return distance <= threshold;
  }
}
module.exports = FaceVectorService;
