export function setItems(key: string, value: string) {
  const oldValue = localStorage.getItem(key);
  localStorage.setItem(key, value);
  
  const event = new CustomEvent("itemsChange", {
    detail: {
      key,
      newValue: value,
      oldValue
    }
  });
  window.dispatchEvent(event);
}