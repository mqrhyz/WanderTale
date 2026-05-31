/** Điền form checkout Booking.com VN — robust React handling với retry và verify */
function main(params) {
  var familyName = params.familyName || "";
  var givenName = params.givenName || "";
  var email = params.email || "";
  var phone = params.phone || "";
  var debug = [];

  function setReactValue(input, value) {
    if (!input || value === "") return false;
    try {
      input.scrollIntoView({ block: "center", behavior: "instant" });
      input.focus();

      // Use native value setter for React-controlled inputs
      var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      );
      if (nativeInputValueSetter && nativeInputValueSetter.set) {
        nativeInputValueSetter.set.call(input, value);
      } else {
        input.value = value;
      }

      // Dispatch all React-relevant events
      input.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));

      return true;
    } catch (e) {
      debug.push("err:" + e.message);
      return false;
    }
  }

  function findInput(selectors, labelPatterns) {
    // Try selectors first
    for (var i = 0; i < selectors.length; i++) {
      var els = document.querySelectorAll(selectors[i]);
      for (var j = 0; j < els.length; j++) {
        var el = els[j];
        if (el && el.offsetParent !== null && !el.disabled) {
          return el;
        }
      }
    }
    // Try by label
    if (labelPatterns) {
      var labels = document.querySelectorAll("label");
      for (var k = 0; k < labels.length; k++) {
        var labelText = (labels[k].textContent || "").toLowerCase().trim();
        for (var l = 0; l < labelPatterns.length; l++) {
          if (labelText.indexOf(labelPatterns[l]) !== -1) {
            var forAttr = labels[k].getAttribute("for");
            var input = forAttr ? document.getElementById(forAttr) : null;
            if (!input) {
              var parent = labels[k].closest("div, fieldset, section, label");
              if (parent) {
                input = parent.querySelector('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])');
              }
            }
            if (input && input.offsetParent !== null) return input;
          }
        }
      }
    }
    return null;
  }

  function fillWithRetry(selectors, labelPatterns, value, fieldName) {
    if (!value) return false;
    for (var attempt = 0; attempt < 3; attempt++) {
      var input = findInput(selectors, labelPatterns);
      if (!input) {
        debug.push(fieldName + ":no-input");
        return false;
      }
      setReactValue(input, value);

      // Verify value was set correctly
      var current = input.value || "";
      if (current === value || current.length >= value.length * 0.8) {
        debug.push(fieldName + ":ok-attempt-" + (attempt + 1));
        return true;
      }
      debug.push(fieldName + ":retry-" + (attempt + 1) + "-got-" + current.length);
    }
    return false;
  }

  var results = {
    ho: fillWithRetry(
      [
        'input[name="lastname"]',
        'input[name="lastName"]',
        'input#lastname',
        '[data-testid="lastname"]',
        'input[autocomplete="family-name"]',
      ],
      ["họ", "last name", "family name", "surname"],
      familyName,
      "ho"
    ),
    ten: fillWithRetry(
      [
        'input[name="firstname"]',
        'input[name="firstName"]',
        'input#firstname',
        '[data-testid="firstname"]',
        'input[autocomplete="given-name"]',
      ],
      ["tên", "first name", "given name"],
      givenName,
      "ten"
    ),
    email: fillWithRetry(
      [
        'input[name="email"]',
        'input#email',
        'input[type="email"]',
        '[data-testid="email"]',
      ],
      ["email", "e-mail", "địa chỉ email"],
      email,
      "email"
    ),
    phone: fillWithRetry(
      [
        'input[name="phone"]',
        'input#phone',
        'input[type="tel"]',
        'input[name="phoneNumber"]',
        '[data-testid="phone"]',
      ],
      ["điện thoại", "phone", "mobile", "số điện thoại"],
      phone,
      "phone"
    ),
  };

  var filled = 0;
  if (results.ho) filled++;
  if (results.ten) filled++;
  if (results.email) filled++;
  if (results.phone) filled++;

  return { filled: filled, debug: debug, results: results };
}
