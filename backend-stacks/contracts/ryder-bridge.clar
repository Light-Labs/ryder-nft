;; dumb ryder-bridge
;; anybody can burn nfts
;; anybody can mint nfts
(define-constant err-not-authorized (err u403))
(define-constant err-not-found (err u404))
(define-constant err-invalid-tier (err u500))

(define-public (mint (id uint) (tier uint))
    (begin
        ;; check that
        (asserts! (is-eq (default-to tier (get-tier id)) tier) err-invalid-tier)
        (contract-call? .ryder-nft mint id tier)))

(define-public (burn (id uint))
    (begin
        (try! (contract-call? .ryder-nft burn id))
        (ok true)))

(define-private (get-tier (id uint))
    (match (contract-call? .ryder-nft get-mint-info id)
        mint-info (some (get tier mint-info))
        none))
