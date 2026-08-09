/**
 * SignalForHelpDetector.js
 * 1:1 Port of gesture_detector.py SignalForHelpDetector
 * 
 * Detector for the internationally recognized 'Signal for Help' gesture:
 * 1. OPEN_PALM: Open palm facing camera with 4 fingers extended & thumb open.
 * 2. THUMB_TUCKED: Thumb tucks into the palm while 4 fingers remain extended.
 * 3. FINGERS_CLOSED_OVER_THUMB: Four fingers fold down over the tucked thumb (fist).
 */

export function getXYZ(landmark) {
  if (!landmark) return { x: 0, y: 0, z: 0 };
  return {
    x: landmark.x ?? 0.0,
    y: landmark.y ?? 0.0,
    z: landmark.z ?? 0.0,
  };
}

export function euclideanDistance(pt1, pt2) {
  return Math.sqrt((pt1.x - pt2.x) ** 2 + (pt1.y - pt2.y) ** 2);
}

export class SignalForHelpDetector {
  static STATE_IDLE = "IDLE";
  static STATE_OPEN_PALM = "OPEN_PALM";
  static STATE_THUMB_TUCKED = "THUMB_TUCKED";
  static STATE_TRIGGERED = "FINGERS_CLOSED_OVER_THUMB";

  constructor(timeoutSeconds = 3.0) {
    this.timeoutSeconds = timeoutSeconds;
    this.state = SignalForHelpDetector.STATE_IDLE;
    this.startTime = null;
    this.lastHandTime = null;
    this.triggered = false;
    this.triggerTime = null;
  }

  reset() {
    this.state = SignalForHelpDetector.STATE_IDLE;
    this.startTime = null;
    this.lastHandTime = null;
    this.triggered = false;
    this.triggerTime = null;
  }

  isTriggered() {
    return this.triggered;
  }

  analyzeHandPose(landmarks) {
    const pts = landmarks.map(lm => getXYZ(lm));

    const wrist = pts[0];
    const thumb_tip = pts[4];
    const thumb_mcp = pts[2];

    const index_mcp = pts[5];
    const index_pip = pts[6];
    const index_tip = pts[8];

    const middle_mcp = pts[9];
    const middle_pip = pts[10];
    const middle_tip = pts[12];

    const ring_mcp = pts[13];
    const ring_pip = pts[14];
    const ring_tip = pts[16];

    const pinky_mcp = pts[17];
    const pinky_pip = pts[18];
    const pinky_tip = pts[20];

    // Reference scale: Palm size (Wrist to Middle MCP)
    let palmSize = euclideanDistance(wrist, middle_mcp);
    if (palmSize < 1e-5) {
      palmSize = 1.0;
    }

    // Check extended state for 4 fingers (Index, Middle, Ring, Pinky)
    // Note: y is 0 at top, so tip.y < pip.y means tip is higher than pip
    const indexExt = index_tip.y < index_pip.y && (euclideanDistance(index_mcp, index_tip) > 0.85 * euclideanDistance(index_mcp, index_pip));
    const middleExt = middle_tip.y < middle_pip.y && (euclideanDistance(middle_mcp, middle_tip) > 0.85 * euclideanDistance(middle_mcp, middle_pip));
    const ringExt = ring_tip.y < ring_pip.y && (euclideanDistance(ring_mcp, ring_tip) > 0.85 * euclideanDistance(ring_mcp, ring_pip));
    const pinkyExt = pinky_tip.y < pinky_pip.y && (euclideanDistance(pinky_mcp, pinky_tip) > 0.85 * euclideanDistance(pinky_mcp, pinky_pip));

    const extendedCount = (indexExt ? 1 : 0) + (middleExt ? 1 : 0) + (ringExt ? 1 : 0) + (pinkyExt ? 1 : 0);
    const fourFingersExtended = extendedCount >= 3;

    // Check curled state for 4 fingers
    const indexCurled = index_tip.y > index_pip.y || (euclideanDistance(index_mcp, index_tip) < 1.1 * euclideanDistance(index_mcp, index_pip));
    const middleCurled = middle_tip.y > middle_pip.y || (euclideanDistance(middle_mcp, middle_tip) < 1.1 * euclideanDistance(middle_mcp, middle_pip));
    const ringCurled = ring_tip.y > ring_pip.y || (euclideanDistance(ring_mcp, ring_tip) < 1.1 * euclideanDistance(ring_mcp, ring_pip));
    const pinkyCurled = pinky_tip.y > pinky_pip.y || (euclideanDistance(pinky_mcp, pinky_tip) < 1.1 * euclideanDistance(pinky_mcp, pinky_pip));

    const curledCount = (indexCurled ? 1 : 0) + (middleCurled ? 1 : 0) + (ringCurled ? 1 : 0) + (pinkyCurled ? 1 : 0);
    const fourFingersCurled = curledCount >= 3;

    // Thumb state relative to palm MCPs
    const thumbPinkyDist = euclideanDistance(thumb_tip, pinky_mcp) / palmSize;
    const thumbMiddleDist = euclideanDistance(thumb_tip, middle_mcp) / palmSize;

    // Thumb is tucked if tip is close to middle or pinky MCP (folded across palm)
    const thumbIsTucked = (thumbPinkyDist < 0.60) || (thumbMiddleDist < 0.40);
    const thumbIsExtended = (thumbPinkyDist > 0.70) && !thumbIsTucked;

    return {
      fourFingersExtended,
      fourFingersCurled,
      thumbIsTucked,
      thumbIsExtended,
      extendedCount,
      curledCount,
      thumbPinkyDist,
      thumbMiddleDist,
      palmSize
    };
  }

  update(landmarks) {
    const now = Date.now() / 1000.0;

    // Timeout check for sequence completion
    if (this.state === SignalForHelpDetector.STATE_OPEN_PALM || this.state === SignalForHelpDetector.STATE_THUMB_TUCKED) {
      if (this.startTime && (now - this.startTime > this.timeoutSeconds)) {
        this.reset();
      }
    }

    // Trigger banner auto-reset window (3s)
    if (this.triggered && this.triggerTime && (now - this.triggerTime > 3.0)) {
      this.reset();
    }

    if (!landmarks || landmarks.length < 21) {
      // If hand is lost during active sequence for > 1 second, reset
      if (this.state === SignalForHelpDetector.STATE_OPEN_PALM || this.state === SignalForHelpDetector.STATE_THUMB_TUCKED) {
        if (this.lastHandTime && (now - this.lastHandTime > 1.0)) {
          this.reset();
        }
      }
      return {
        state: this.state,
        pose: null,
        triggered: this.triggered,
        timeRemaining: this.startTime ? Math.max(0, this.timeoutSeconds - (now - this.startTime)) : 0
      };
    }

    this.lastHandTime = now;
    const pose = this.analyzeHandPose(landmarks);

    // Strict State Machine Logic
    if (this.state === SignalForHelpDetector.STATE_IDLE) {
      // Step 1: Must start with open palm and extended thumb
      if (pose.fourFingersExtended && pose.thumbIsExtended) {
        this.state = SignalForHelpDetector.STATE_OPEN_PALM;
        this.startTime = now;
      }
    } else if (this.state === SignalForHelpDetector.STATE_OPEN_PALM) {
      // Step 2: Thumb tucks into palm while 4 fingers remain extended
      if (pose.fourFingersExtended && pose.thumbIsTucked) {
        this.state = SignalForHelpDetector.STATE_THUMB_TUCKED;
      } else if (pose.fourFingersCurled) {
        // Closed fingers directly without tucking thumb first -> invalid, reset!
        this.reset();
      }
    } else if (this.state === SignalForHelpDetector.STATE_THUMB_TUCKED) {
      // Step 3: Four fingers fold down over tucked thumb
      if (pose.fourFingersCurled && pose.thumbIsTucked) {
        this.state = SignalForHelpDetector.STATE_TRIGGERED;
        this.triggered = true;
        this.triggerTime = now;
      } else if (pose.fourFingersExtended && pose.thumbIsExtended) {
        // Returned to open palm posture
        this.state = SignalForHelpDetector.STATE_OPEN_PALM;
      }
    }

    const timeRemaining = this.startTime ? Math.max(0, this.timeoutSeconds - (now - this.startTime)) : 0;

    return {
      state: this.state,
      pose,
      triggered: this.triggered,
      timeRemaining
    };
  }
}
