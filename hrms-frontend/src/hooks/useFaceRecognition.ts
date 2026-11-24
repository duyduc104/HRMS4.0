import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

// Custom Hook nhan dien khuon mat AI va chong gia mao 3D Active Liveness tren trinh duyet
// Giai thich code khong thuan:
// - Su dung song song 2 bo mo hinh AI chay bang WebAssembly (WASM) va WebGL GPU truc tiep tren Client:
//   1. face-api.js (SSD MobileNetV1 + ResNet-34): Trich xuat vector dac trung khuon mat 128 chieu (Face Descriptor).
//   2. Google MediaPipe FaceLandmarker: Phat hien 478 diem moc 3D tren mat va Face Blendshapes de kiem tra bieu cam.
// - Chup anh khuon mat qua HTML5 Canvas xuat base64 kem vector de gui len Backend xac thuc.
// - Tich hop WebRTC MediaStream de bat/tat Webcam theo chu ky song React.

export type LivenessChallenge = 'turn_left' | 'turn_right' | 'look_up' | 'smile';

export const useFaceRecognition = () => {
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);

  // Ham useEffect nay dung de tai truoc cac mo hinh trong so AI (Face-API va MediaPipe) tu thu muc public/models va /wasm
  useEffect(() => {
    let isMounted = true;
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        // 1. Load face-api.js models (dung cho trich xuat 128-d vector de nhan dien)
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        // 2. Load MediaPipe FaceLandmarker (dung cho 3D Active Liveness chong gia mao)
        const filesetResolver = await FilesetResolver.forVisionTasks(
          '/wasm'
        );
        const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU'
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1
        });
        
        if (isMounted) {
          faceLandmarkerRef.current = faceLandmarker;
          setIsModelsLoaded(true);
          console.log('[FaceRecognition] ✅ All face models (Face-API & MediaPipe) loaded successfully.');
        }
      } catch (e) {
        console.error("Error loading face models.", e);
      }
    };
    loadModels();
    return () => { isMounted = false; };
  }, []);

  // Ham nay dung de khoi dong Camera qua giao thuc WebRTC getUserMedia va gan vao the video
  const startVideo = useCallback(() => {
    setIsVideoReady(false);
    navigator.mediaDevices.getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;

          videoRef.current.onplaying = () => {
            console.log('[FaceRecognition] ✅ Video stream is playing and ready.');
            setIsVideoReady(true);
          };
        }
      })
      .catch((err) => console.error("Không thể mở Camera:", err));
  }, []);

  // Ham nay dung de dung Camera va giai phong cac luong MediaStream track tranh ton pin va RAM
  const stopVideo = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsVideoReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopVideo();
    };
  }, [stopVideo]);

  // Ham nay dung de cho doi luong video stream san sang du lieu khung hinh (readyState >= 2)
  const waitForVideoReady = async (timeoutMs = 5000): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.warn('[FaceRecognition] ⚠️ Video stream not ready after timeout.');
    return false;
  };

  // Ham nay dung de quet khuon mat, kiem tra do phu hop vi tri/khoang cach va trich xuat vector 128 chieu kem anh snapshot base64
  const extractFaceVector = async (retries = 5): Promise<{ vector: number[], image: string } | null> => {
    if (!videoRef.current || !isModelsLoaded) {
      console.warn('[FaceRecognition] ⚠️ Video ref or models not available.');
      return null;
    }

    const videoReady = await waitForVideoReady(5000);
    if (!videoReady) {
      console.error('[FaceRecognition] ❌ Video không sẵn sàng, không thể detect.');
      return null;
    }

    console.log(`[FaceRecognition] 🔍 Starting face detection (max ${retries} retries)...`);

    for (let i = 0; i < retries; i++) {
      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const { x, y, width, height } = detection.detection.box;
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          
          // Kiểm tra xem khuôn mặt có nằm hoàn toàn trong khung hình không
          const isInsideFrame = x >= 0 && y >= 0 && (x + width) <= videoWidth && (y + height) <= videoHeight;
          
          // Kiểm tra xem khuôn mặt có đủ lớn không (tránh việc đứng quá xa)
          // Yêu cầu khuôn mặt chiếm ít nhất 15% chiều rộng hoặc chiều cao khung hình
          const isLargeEnough = (width / videoWidth) > 0.15 || (height / videoHeight) > 0.15;

          if (!isInsideFrame || !isLargeEnough) {
            console.warn(`[FaceRecognition] ⚠️ Khuôn mặt chưa ngay ngắn (Trong khung: ${isInsideFrame}, Đủ lớn: ${isLargeEnough})`);
            continue; // Bỏ qua lần detect này, thử lại
          }

          console.log(`[FaceRecognition] ✅ Face detected on attempt ${i + 1}!`);

          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          }
          const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

          return {
            vector: Array.from(detection.descriptor),
            image: imageBase64
          };
        }
      } catch (err) {
        console.error(`[FaceRecognition] ❌ Error on attempt ${i + 1}:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return null;
  };

  // Ham nay dung de kiem tra do song khuon mat chong gia mao (Active Liveness) bang cach yeu cau nguoi dung vuot qua thu thach quay trai, quay phai, nhin len hoac cuoi
  // Giai thich code khong thuan:
  // - Su dung MediaPipe FaceLandmarker tinh toan toa do khong gian 3D cua cac diem moc (landmarks: mui, ma, moi, tran, cam).
  // - Do su thay doi ty le khoang cach Euclid giua dau mui va 2 ben ma de phat hien quay dau trai/phai.
  // - Doc truc tiep Face Blendshapes (mouthSmileLeft, mouthSmileRight > 0.5) de xac nhan hanh dong mim cuoi.
  // - Vong lap kiem tra duoc toi uu hoa bang requestAnimationFrame (~60 fps) kem co che time-out.
  const verifyLivenessDynamic = async (challenge: LivenessChallenge, timeoutMs = 10000): Promise<boolean> => {
    if (!videoRef.current || !isModelsLoaded || !faceLandmarkerRef.current) {
      console.warn('[FaceRecognition] ⚠️ Video ref or models not available for liveness.');
      return false;
    }

    console.log(`[FaceRecognition] 🏃 Bắt đầu thử thách động: ${challenge}...`);
    const start = Date.now();
    let lastVideoTime = -1;

    return new Promise((resolve) => {
      let isResolved = false;

      const checkChallenge = async () => {
        if (isResolved) return;

        if (Date.now() - start > timeoutMs) {
          console.warn(`[FaceRecognition] ❌ Hết thời gian thử thách ${challenge}.`);
          isResolved = true;
          resolve(false);
          return;
        }

        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const videoTime = videoRef.current.currentTime;
            if (videoTime !== lastVideoTime) {
              lastVideoTime = videoTime;
              const result = faceLandmarkerRef.current!.detectForVideo(videoRef.current, performance.now());
              
              if (result.faceLandmarks && result.faceLandmarks.length > 0) {
                const landmarks = result.faceLandmarks[0];
                // Lấy các điểm mốc 3D quan trọng
                const noseTip = landmarks[1];
                const leftCheek = landmarks[234];
                const rightCheek = landmarks[454];
                const top = landmarks[10];
                const bottom = landmarks[152];
                const leftLip = landmarks[61];
                const rightLip = landmarks[291];

                let passed = false;

                switch (challenge) {
                  case 'turn_left':
                    // Quay trái (theo hướng camera là sang phải màn hình)
                    // Khoảng cách từ mũi đến má phải < khoảng cách từ mũi đến má trái nhiều lần
                    if (Math.abs(noseTip.x - rightCheek.x) < Math.abs(noseTip.x - leftCheek.x) * 0.65) {
                      passed = true;
                    }
                    break;
                  case 'turn_right':
                    // Quay phải 
                    if (Math.abs(noseTip.x - leftCheek.x) < Math.abs(noseTip.x - rightCheek.x) * 0.65) {
                      passed = true;
                    }
                    break;
                  case 'look_up':
                    // Nhìn lên (bình thường mũi gần cằm hơn đỉnh trán rất nhiều, N_to_Top ~ 2 * N_to_Bottom)
                    // Khi nhìn lên, khoảng cách này xích lại gần nhau, nên tỷ lệ < 1.3 là đủ để xác nhận nhìn lên
                    if (Math.abs(noseTip.y - top.y) < Math.abs(noseTip.y - bottom.y) * 1.3) {
                      passed = true;
                    }
                    break;
                  case 'smile':
                    // Mỉm cười (Khoảng cách khóe môi rộng ra so với bình thường)
                    // Blendshapes của MediaPipe cung cấp sẵn chỉ số smile
                    if (result.faceBlendshapes && result.faceBlendshapes.length > 0) {
                      const smileLeft = result.faceBlendshapes[0].categories.find(c => c.categoryName === 'mouthSmileLeft')?.score || 0;
                      const smileRight = result.faceBlendshapes[0].categories.find(c => c.categoryName === 'mouthSmileRight')?.score || 0;
                      if (smileLeft > 0.5 && smileRight > 0.5) {
                        passed = true;
                      }
                    } else {
                      // Fallback tính tay
                      const mouthWidth = Math.abs(leftLip.x - rightLip.x);
                      const faceWidth = Math.abs(leftCheek.x - rightCheek.x);
                      if (mouthWidth / faceWidth > 0.45) { // Tỉ lệ môi/mặt mở rộng
                        passed = true;
                      }
                    }
                    break;
                }

                if (passed) {
                  console.log(`[FaceRecognition] ✅ Vượt qua thử thách: ${challenge}!`);
                  isResolved = true;
                  resolve(true);
                  return;
                }
              }
            }
          } catch (err) {
            console.error('[FaceRecognition] Lỗi detect mediapipe:', err);
          }
        }

        if (!isResolved) {
          requestAnimationFrame(checkChallenge); // Tối ưu vòng lặp ~60fps
        }
      };

      checkChallenge();
    });
  };

  /* ==========================================
     BACKUP: Phương án CŨ (Kiểm tra chớp mắt bằng face-api.js)
     ==========================================
  const verifyLivenessBlink = async (requiredBlinks = 1, timeoutMs = 15000): Promise<boolean> => {
    if (!videoRef.current || !isModelsLoaded) {
      console.warn('[FaceRecognition] ⚠️ Video ref or models not available for liveness.');
      return false;
    }

    console.log(`[FaceRecognition] 👀 Bắt đầu thử thách chớp mắt (${requiredBlinks} lần)...`);

    let blinkCount = 0;
    let isEyesClosed = false;
    let closeStartTime = 0;
    let missedFrames = 0;
    const start = Date.now();

    const CLOSE_THRESHOLD = 0.25;  
    const OPEN_THRESHOLD  = 0.28;  

    const dist2D = (p1: faceapi.Point, p2: faceapi.Point) => Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

    const calculateEAR = (eye: faceapi.Point[]) => {
      const v1 = dist2D(eye[1], eye[5]);
      const v2 = dist2D(eye[2], eye[4]);
      const h  = dist2D(eye[0], eye[3]);
      return h > 0 ? (v1 + v2) / (2.0 * h) : 0.3;
    };

    return new Promise((resolve) => {
      let isResolved = false;

      const checkBlink = async () => {
        if (isResolved) return;
        if (Date.now() - start > timeoutMs) {
          isResolved = true;
          resolve(false);
          return;
        }

        if (videoRef.current && videoRef.current.readyState >= 2) {
          try {
            const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks();
            if (detection) {
              missedFrames = 0;
              const landmarks = detection.landmarks;
              const leftEAR  = calculateEAR(landmarks.getLeftEye());
              const rightEAR = calculateEAR(landmarks.getRightEye());
              const avgEAR   = (leftEAR + rightEAR) / 2.0;

              if (!isEyesClosed && avgEAR <= CLOSE_THRESHOLD) {
                isEyesClosed = true;
                closeStartTime = Date.now();
              } else if (isEyesClosed && avgEAR >= OPEN_THRESHOLD) {
                const duration = Date.now() - closeStartTime;
                isEyesClosed = false;
                if (duration >= 50 && duration <= 2000) {
                  blinkCount++;
                  if (blinkCount >= requiredBlinks) {
                    isResolved = true;
                    resolve(true);
                    return;
                  }
                }
              }
            } else {
              missedFrames++;
              if (missedFrames > 8) isEyesClosed = false;
            }
          } catch (err) {
            console.error(err);
          }
        }
        if (!isResolved) setTimeout(() => requestAnimationFrame(checkBlink), 16);
      };
      checkBlink();
    });
  };
  */

  return { isModelsLoaded, isVideoReady, videoRef, startVideo, stopVideo, extractFaceVector, verifyLivenessDynamic };
};
