;; ryder-mint

(define-constant deployer tx-sender)
;; TODO set correct shuffle height
(define-constant shuffle-height (+ block-height u10))
(define-constant price-list (list u1000000000 u2500000000 u10000000000 u25000000000))

(define-map mints-per-user principal uint)
(define-map mint-passes principal uint)
(define-map ids uint uint)

(define-data-var admin principal tx-sender)

(define-data-var last-index uint u0)
(define-data-var mint-active bool false)
(define-data-var mint-limit uint u2500)

(define-constant err-not-authorized (err u403))
(define-constant err-paused (err u500))
(define-constant err-too-early (err u501))
(define-constant err-sold-out (err u502))
(define-constant err-minting-failed (err u503))

(define-public (claim) 
  (mint-many (list u2)))

(define-public (claim-three) (mint-many (list u2 u2 u2)))

(define-public (claim-five) (mint-many (list u2 u2 u2 u2 u2)))

(define-public (claim-ten) (mint-many (list u2 u2 u2 u2 u2 u2 u2 u2 u2 u2)))

(define-public (mint-many (tiers (list 25 uint )))  
  (let 
    (
      ;; mint ordered nfts with given tiers
      (summary (fold mint-iter tiers {index: (var-get last-index), price: u0}))
      (index-reached (print (get index summary)))
      (total-price (print (get price summary)))
      (user-mints (get-mints tx-sender))
    )
    (asserts! (var-get mint-active) err-paused)
    (asserts! (<= index-reached (var-get mint-limit)) err-sold-out)
    (asserts! (is-eq index-reached (+ (len tiers) (var-get last-index))) err-minting-failed)
    (map-set mints-per-user tx-sender (+ user-mints (- index-reached (var-get last-index))))
    (var-set last-index index-reached)
    ;; transfer price
    (if (is-eq total-price u0)
        true 
        (try! (stx-transfer? total-price tx-sender deployer)))
    (ok index-reached)))

(define-private (mint-iter (tier uint) (context {index: uint, price: uint}))
  (match (element-at price-list tier)
    price (let ((new-index (+ u1 (get index context))))
      (match (contract-call? .ryder-nft mint (default-to u0 (map-get? ids new-index)) tier)
        success {index: new-index, price: (+ price (get price context))}
        error (begin (print {error: error, tier: tier, context: context}) context)))
    context))
  

(define-read-only (get-mints (account principal))
  (default-to u0 (map-get? mints-per-user account)))

(define-read-only (is-admin (account principal))
  (is-eq tx-sender (var-get admin)))

(define-public (flip-mint-active)
  (let ((new-state (not (var-get mint-active))))
    (asserts! (is-admin tx-sender) err-not-authorized)
    (var-set mint-active new-state)
    (ok new-state)))
;;
;; initialized ids
;;

(define-public (shuffle-ids)
  (begin 
    (asserts! (> block-height shuffle-height) err-too-early)
    (map shuffle index-5000)
    (ok true)))


(define-private (vrf-mod-5000 (wrapped-seed (optional (buff 32))))
  (match wrapped-seed
    seed u1
    u0))
  
(define-private (shuffle (i uint))
  (let ((replaced-id (default-to i (map-get? ids i)))
    (i2 (vrf-mod-5000 (get-block-info? vrf-seed (- shuffle-height i)))))
    (map-set ids i (default-to i2 (map-get? ids i2)))
    (map-set ids i2 replaced-id)
    (print {index: i, id: (map-get? ids i), index2: i2, id2: (map-get? ids i2)})))


(define-constant index-5000 (list u1 u2 u3 u4 u5 u6 u7 u8 u9 u10))