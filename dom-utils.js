// dom-utils.js
var IkeaDomUtils = (function () {
    function insertAfterElement(selector, newElement, context = document) {
        const referenceElement = context.querySelector(selector);
        if (referenceElement && referenceElement.parentNode) {
            referenceElement.parentNode.insertBefore(newElement, referenceElement.nextSibling);
        } else {
            document.body.appendChild(newElement);
        }
    }

    function handleComparisonError(error, retryCount, retryFunction) {
        console.error('Error fetching comparison prices:', error);
        if (retryCount < 3) {
            console.log(`Retrying (${retryCount + 1}/3)...`);
            setTimeout(() => retryFunction(retryCount + 1), 2000);
        } else {
            displayError('Unable to fetch comparison prices. The product might not be available in some countries.');
        }
    }

    function displayError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background-color: #ffeeee; color: #ff0000; padding: 10px; margin-top: 10px; border-radius: 5px;';
        errorDiv.textContent = message;
        insertAfterElement('.pip-temp-price-module__addons', errorDiv);
    }

    return {
        insertAfterElement: insertAfterElement,
        handleComparisonError: handleComparisonError,
        displayError: displayError
    };
})();