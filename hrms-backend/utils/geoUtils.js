/**
 * Tính khoảng cách (mét) giữa 2 điểm tọa độ bằng công thức Haversine
 */
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Bán kính trái đất tính bằng mét
  const p1 = lat1 * Math.PI/180; 
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
          Math.cos(p1) * Math.cos(p2) *
          Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const distance = R * c; 
  return distance; 
}

module.exports = {
  getDistanceFromLatLonInMeters
};
