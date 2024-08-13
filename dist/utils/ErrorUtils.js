export const ErrorUtils = {
    logError(error, context) {
        console.error(`Error in ${context}:`, error);
    },
    displayUserError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #ffdddd;
      color: #ff0000;
      padding: 15px;
      border-radius: 5px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 9999;
      max-width: 80%;
      text-align: center;
    `;
        errorDiv.innerHTML = 'Chyba rozšíření IKEA Price Scout:<br><br>' + message;
        document.body.appendChild(errorDiv);
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transition = 'opacity 0.5s ease-out';
            setTimeout(() => document.body.removeChild(errorDiv), 500);
        }, 10000);
    },
    handleError(error, context, userMessage) {
        this.logError(error, context);
        this.displayUserError(userMessage);
    }
};
