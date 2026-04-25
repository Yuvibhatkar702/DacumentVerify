/**
 * Aadhaar e-KYC Page
 *
 * This page simply renders the reusable Aadhaar sandbox OTP component.
 */

import React from 'react';
import AadhaarSandboxVerification from '../components/AadhaarSandboxVerification';

const AadhaarEKycPage = () => {
  return (
    <div className="page-container">
      <AadhaarSandboxVerification />
    </div>
  );
};

export default AadhaarEKycPage;
