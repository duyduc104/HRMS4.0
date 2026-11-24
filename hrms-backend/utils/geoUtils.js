// Tien ich tinh toan toa do dia ly GPS va kiem tra khoang cach Geofencing
// Giai thich code khong thuan:
// - Ap dung cong thuc luong giac Haversine tren mat cau:
//   a = sin^2(dp/2) + cos(p1)*cos(p2)*sin^2(dl/2)
//   c = 2 * atan2(sqrt(a), sqrt(1-a))
//   distance = R * c (voi ban kinh trai dat R = 6,371,000 met)
// - Giup tinh chinh xac khoang cach tuyet doi giua vi tri nhan vien va toa do van phong cong ty.

// Ham nay dung de tinh khoang cach theo don vi met giua 2 cap toa do GPS (vi do, kinh do) bang cong thuc Haversine
function getDistanceFromLatLonInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Ban kinh trai dat tinh bang met
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
