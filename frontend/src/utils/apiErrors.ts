import axios from 'axios';

type ErrorFieldMap = Record<string, string>;

type ErrorResponseShape = {
  error?: {
    message?: string;
    fields?: ErrorFieldMap;
  };
  message?: string;
};

export function getApiErrorDetails(error: unknown): { message: string; fields?: ErrorFieldMap } {
  if (axios.isAxiosError<ErrorResponseShape>(error)) {
    const responseData = error.response?.data;
    const message =
      responseData?.error?.message ||
      responseData?.message ||
      (error.code === 'ECONNABORTED'
        ? 'The server took too long to respond. Please try again.'
        : null) ||
      (!error.response
        ? 'Cannot reach the server right now. Please make sure the backend and database are running.'
        : null) ||
      error.message ||
      'Something went wrong. Please try again.';

    return {
      message,
      fields: responseData?.error?.fields,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: 'Something went wrong. Please try again.' };
}
