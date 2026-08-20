export function boundedStatusNote(message, maximumLength = 1000) {
  if (message.length <= maximumLength) {
    return message;
  }
  const suffix = '... [trimmed]';
  return `${message.slice(0, maximumLength - suffix.length)}${suffix}`;
}
