let board = null
const game = new Chess()
const $status = $("#status")

function onDragStart(source, piece, position, orientation) {
  // Do not pick up pieces if the game is over
  if (game.game_over()) return false

  // Only pick up pieces for the side to move
  if ((game.turn() === "w" && piece.search(/^b/) !== -1) || (game.turn() === "b" && piece.search(/^w/) !== -1)) {
    return false
  }
}

function onDrop(source, target) {
  // see if the move is legal
  const move = game.move({
    from: source,
    to: target,
    promotion: "q", // NOTE: always promote to a queen for simplicity
  })

  // illegal move
  if (move === null) return "snapback"

  updateStatus()
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
  board.position(game.fen())
}

function updateStatus() {
  let status = ""

  let moveColor = "White"
  if (game.turn() === "b") {
    moveColor = "Black"
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = "Game over, " + moveColor + " is in checkmate."
  }

  // draw?
  else if (game.in_draw()) {
    status = "Game over, drawn position"
  }

  // game still on
  else {
    status = moveColor + " to move"

    // check?
    if (game.in_check()) {
      status += ", " + moveColor + " is in check"
    }
  }

  $status.html(status)
}

const config = {
  draggable: true,
  position: "start",
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
}
board = Chessboard("board", config)

updateStatus()