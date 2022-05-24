;; dumb ryder-bridge
;; anybody can burn nfts
;; anybody can mint nfts
(define-constant err-not-authorized (err u403))
(define-constant err-not-found (err u404))
(define-constant err-invalid-tier (err u500))

(define-public (mint (id uint) (tier uint))
    (begin
        (match (contract-call? .ryder-nft get-mint-info id)
            mint-info (let ((old-tier (get tier mint-info)))
                        (asserts! (is-eq old-tier tier) err-invalid-tier))
            true)
        (contract-call? .ryder-nft mint id tier)))

(define-public (burn (id uint))
    (contract-call? .ryder-nft burn id))
