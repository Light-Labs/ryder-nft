
(define-constant list-1 (list
  tx-sender
))

(define-public (set-allow-list)
  (contract-call? .ryder-mint set-allow-listed-many list-1))
