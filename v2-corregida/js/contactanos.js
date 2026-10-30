const form = document.getElementById("contact-form");
const inputElements = form.getElementsByTagName("input");
const textareaElements = form.getElementsByTagName("textarea");
const errorMessages = document.getElementsByClassName("error-message");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  let isFormValid = true;

  for (let i = 0; i < inputElements.length; i++) {
    const inputElement = inputElements[i];
    const errorMessageElement = errorMessages[i];

    if (!inputElement.checkValidity()) {
      isFormValid = false;
      errorMessageElement.textContent = inputElement.validationMessage;
    } else {
      errorMessageElement.textContent = "";
    }
  }

  for (let i = 0; i < textareaElements.length; i++) {
    const textareaElement = textareaElements[i];
    const errorMessageElement = errorMessages[inputElements.length + i];

    if (!textareaElement.checkValidity()) {
      isFormValid = false;
      errorMessageElement.textContent = textareaElement.validationMessage;
    } else {
      errorMessageElement.textContent = "";
    }
  }

  if (isFormValid) {
    form.submit();
  }
});