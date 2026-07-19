const PHONE_RE = /^[\d\s()+-]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PHOTO_SIZE_MB = 10;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export function validatePhone(phone) {
  if (!phone || !phone.trim()) return 'Phone number is required';
  if (!PHONE_RE.test(phone.trim())) return 'Enter a valid phone number';
  return null;
}

export function validateEmail(email) {
  if (!email || !email.trim()) return null; // optional
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address';
  return null;
}

export function validatePhotos(photos) {
  if (!photos || photos.length < 3) return 'At least 3 photos are required';
  if (photos.length > 10) return 'Maximum 10 photos allowed';
  return null;
}

export function validateImageFile(file) {
  if (!file) return 'No file provided';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|heic|heif)$/i)) {
    return 'Only JPG, PNG, WebP, and HEIC images are accepted';
  }
  if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
    return `File must be under ${MAX_PHOTO_SIZE_MB}MB`;
  }
  return null;
}

export function validateMonetary(value, fieldName) {
  const n = Number(value);
  if (value === '' || value === null || value === undefined) return `${fieldName} is required`;
  if (isNaN(n)) return `${fieldName} must be a number`;
  if (n < 0) return `${fieldName} cannot be negative`;
  return null;
}

export function validateExpirationDate(dateStr) {
  if (!dateStr) return 'Expiration date is required';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Invalid date';
  if (d <= new Date()) return 'Expiration must be in the future';
  return null;
}

export function validateCompletionData(actuals) {
  const errors = {};
  if (actuals.finalAmount === '' || actuals.finalAmount === null || actuals.finalAmount === undefined) {
    errors.finalAmount = 'Final amount collected is required';
  } else if (Number(actuals.finalAmount) < 0) {
    errors.finalAmount = 'Amount cannot be negative';
  }
  if (actuals.actualTravelTime !== '' && Number(actuals.actualTravelTime) < 0) {
    errors.actualTravelTime = 'Travel time cannot be negative';
  }
  if (actuals.actualOnSiteTime !== '' && Number(actuals.actualOnSiteTime) < 0) {
    errors.actualOnSiteTime = 'On-site time cannot be negative';
  }
  if (actuals.actualDisposalFee !== '' && Number(actuals.actualDisposalFee) < 0) {
    errors.actualDisposalFee = 'Disposal fee cannot be negative';
  }
  if (actuals.actualLaborCost !== '' && Number(actuals.actualLaborCost) < 0) {
    errors.actualLaborCost = 'Labor cost cannot be negative';
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

export function validateSlotAvailability(slot, bookedSlots) {
  if (!slot) return 'Please select a time slot';
  if (bookedSlots && bookedSlots.includes(slot)) return 'This time slot is no longer available';
  return null;
}
