;; ryder-mint

(define-constant deployer tx-sender)
;; TODO set correct shuffle height
(define-constant shuffle-height (+ block-height u10))
(define-constant price-list (list u1000000000 u2500000000 u10000000000 u25000000000))
(define-constant initial-mint-limits (list u0 u100 u2000 u2100 u2200 u2450 u2500))
(define-map mints-per-user principal uint)
(define-map mint-passes principal uint)

;; map between mint index and nft id
(define-map ids uint uint)

(define-data-var admin principal tx-sender)

(define-data-var last-index uint u0)
(define-data-var mint-active bool false)
(define-data-var mint-limits (list 7 uint) initial-mint-limits)
(define-map index-by-tier uint uint)

(define-constant err-not-authorized (err u403))
(define-constant err-paused (err u500))
(define-constant err-too-early (err u501))
(define-constant err-sold-out (err u502))
(define-constant err-minting-failed (err u503))
(define-constant err-invalid-limits (err u504))

(define-public (claim) 
  (mint-many (list u2)))

(define-public (claim-three) (mint-many (list u2 u2 u2)))

(define-public (claim-five) (mint-many (list u2 u2 u2 u2 u2)))

(define-public (claim-ten) (mint-many (list u2 u2 u2 u2 u2 u2 u2 u2 u2 u2)))

(define-public (mint-many (tiers (list 25 uint )))  
  (let 
    (
      ;; mint ordered nfts with given tiers
      (summary (fold mint-iter tiers {count: u0, price: u0}))
      (count (print (get count summary)))
      (total-price (print (get price summary)))
      (user-mints (get-mints tx-sender))
    )
    (asserts! (var-get mint-active) err-paused)
    ;;(asserts! (is-eq count (len tiers)) err-minting-failed)
    (map-set mints-per-user tx-sender (+ user-mints count))
    ;; transfer price
    (if (is-eq total-price u0)
        true 
        (try! (stx-transfer? total-price tx-sender deployer)))
    (ok true)))

(define-private (mint-iter (tier uint) (context {count: uint, price: uint}))
  (match (element-at price-list tier)
    price (let ((new-index (+ u1 (last-index-by-tier tier))))
      (asserts! (index-in-tier-limit (print new-index) tier) (begin (print {err: u1, tier: tier, context: context}) context))
      (map-set index-by-tier tier new-index)
      (match (contract-call? .ryder-nft mint (dickson-4973-permut new-index) tier)
        success {count: (+ u1 (get count context)), price: (+ price (get price context))}
        error (begin (print {error: error, tier: tier, context: context}) context)))
    context))

(define-read-only (last-index-by-tier (tier uint))
  (default-to
    (unwrap! (element-at initial-mint-limits (- tier u1)) u4974)
    (map-get? index-by-tier tier)))
  
(define-read-only (index-in-tier-limit (index uint) (tier uint))
  (<= (print index) (default-to u0 (print (element-at (var-get mint-limits) tier)))))

(define-read-only (get-price-list)
  price-list)

(define-read-only (get-mint-limits)
  (var-get mint-limits))

(define-read-only (get-mints (account principal))
  (default-to u0 (map-get? mints-per-user account)))

(define-read-only (is-admin (account principal))
  (is-eq tx-sender (var-get admin)))

;;
;; admin functions
;;

(define-public (flip-mint-active)
  (let ((new-state (not (var-get mint-active))))
    (asserts! (is-admin tx-sender) err-not-authorized)
    (var-set mint-active new-state)
    (ok new-state)))

(define-public (set-mint-limits (new-limits (list 7 uint)))
  (begin
    (asserts! (is-admin tx-sender) err-not-authorized)
    (asserts! (get result (fold is-in-limits new-limits {tier: u1, result: true})) err-invalid-limits)
    (var-set mint-limits new-limits)
    (ok true)))

(define-read-only (is-in-limits (new-limit uint) (context {tier: uint, result: bool}))
  (let ((tier (get tier context)))
    {tier: (+ u1 tier),
    result: (and (get result context)
              (> new-limit (default-to u0 (element-at (var-get mint-limits) (- u1 tier))))
              (<= new-limit (default-to u0 (element-at (var-get mint-limits) tier))))
    }))

(define-constant a u12)

(define-read-only (dickson-4973-permut (x uint))
  (mod (+ (pow x u5) (* a (pow x u3)) (* a a x u2984)) u4973))