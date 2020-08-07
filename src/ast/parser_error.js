/**
 * Error thrown when a parser gets pissed
 */
export class ParserError extends Error {
  constructor(message) {
    super(message)

    this.name = "ParserError"
  }
}

/**
 * Helper function to throw an error at a specific index in a string.
 * @param string {String} The string to complain about
 * @param index {number} The index in the string where the error occurred
 * @param message {String} The error message
 */
export function getAngryAt(string, index=0, message="I'm angry!") {
  // Spaces to offset the caret to the correct place along the string
  const spaces = " ".repeat(index)

  throw new ParserError(message + " at index " + index + ":\n" + string + "\n" + spaces + "^")
}
