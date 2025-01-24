import { saveBodyDetails } from './auth.js';

export function showBodyDetailsModal() {
  // Remove any existing modal first
  hideBodyDetailsModal();
  
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'bodyDetailsModal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>Complete Your Profile</h2>
      <p>Please enter your body details to get personalized recommendations</p>
      
      <form id="bodyDetailsForm" class="body-details-form">
        <div class="form-group">
          <label for="height">Height (cm)</label>
          <input type="number" id="height" required min="100" max="250">
        </div>
        
        <div class="form-group">
          <label for="weight">Weight (kg)</label>
          <input type="number" id="weight" required min="30" max="300">
        </div>
        
        <div class="form-group">
          <label for="age">Age</label>
          <input type="number" id="age" required min="13" max="100">
        </div>
        
        <div class="form-group">
          <label for="bodyType">Body Type</label>
          <select id="bodyType" required>
            <option value="">Select a body type</option>
            <option value="ectomorph">Ectomorph</option>
            <option value="mesomorph">Mesomorph</option>
            <option value="endomorph">Endomorph</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="fatComposition">Body Fat % (approximate)</label>
          <input type="number" id="fatComposition" required min="3" max="70" step="0.1">
        </div>
        
        <button type="submit" class="button-primary">Save Details</button>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  console.log('Modal shown');  // Debug log

  // Add event listener for form submission
  const form = document.getElementById('bodyDetailsForm');
  form.addEventListener('submit', handleFormSubmit);
}

export function hideBodyDetailsModal() {
  const existingModal = document.getElementById('bodyDetailsModal');
  if (existingModal) {
    existingModal.remove();
    console.log('Modal hidden');  // Debug log
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const details = {
    height: Number(document.getElementById('height').value),
    weight: Number(document.getElementById('weight').value),
    age: Number(document.getElementById('age').value),
    bodyType: document.getElementById('bodyType').value,
    fatComposition: Number(document.getElementById('fatComposition').value)
  };

  await saveBodyDetails(details);
}
