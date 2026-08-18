import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const MIN_PASSWORD_CHARACTERS = 8;
export const MAX_PASSWORD_UTF8_BYTES = 72;

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function maxUtf8BytesValidator(maxBytes: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null;
    }
    if (typeof value !== 'string' || utf8ByteLength(value) > maxBytes) {
      return {
        maxUtf8Bytes: {
          max: maxBytes,
          actual: typeof value === 'string' ? utf8ByteLength(value) : null
        }
      };
    }
    return null;
  };
}
