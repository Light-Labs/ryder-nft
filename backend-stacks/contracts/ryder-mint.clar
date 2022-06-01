;; ryder-mint

(define-constant deployer tx-sender)

;; TODO set correct shuffle height
(define-constant shuffle-height (+ block-height u10))
(define-constant price-list-in-stx (list u0 u50 u250 u350 u500 u1000 u2500 u5000))

(define-map mints-per-user principal uint)
(define-map mints-per-tier uint uint)
(define-map mint-passes principal uint)

(define-data-var mint-active bool false)
(define-constant MINT-LIMIT u4973)
(define-constant chain-agnostic-mint-limits (list u0 u100 u4213 u500 u100 u30 u20 u10))
(define-data-var mint-limits-stx (list 8 uint) (list u0 u60 u2528 u300 u60 u18 u12 u6))
(define-data-var mint-limits-eth (list 8 uint) (list u0 u40 u1685 u200 u40 u12 u8 u4))
(define-data-var last-index uint u0)

;; map between mint index and nft id
(define-map ids uint uint)
;; user or dao contract acting as admin
(define-data-var admin principal tx-sender)

(define-constant err-not-authorized (err u403))
(define-constant err-paused (err u500))
(define-constant err-too-early (err u501))
(define-constant err-sold-out (err u502))
(define-constant err-minting-failed (err u503))
(define-constant err-invalid-limits (err u504))
(define-constant err-fatale (err u999))

(define-public (claim) 
  (mint-many (list u2)))

(define-public (claim-three) (mint-many (list u2 u2 u2)))

(define-public (claim-five) (mint-many (list u2 u2 u2 u2 u2)))

(define-public (claim-ten) (mint-many (list u2 u2 u2 u2 u2 u2 u2 u2 u2 u2)))

(define-public (mint-many (tiers (list 25 uint )))  
  (let 
    (
      ;; mint nfts with given tiers
      (summary (fold mint-iter tiers {count: u0, price: u0}))
      (count (get count summary))
      (total-price (get price summary))
      (user-mints (get-mints tx-sender))
    )
    (print summary)
    (asserts! (var-get mint-active) err-paused)
    ;; TODO should we fail when not all tier could be minted?
    ;; (asserts! (is-eq count (len tiers)) err-minting-failed)
    (map-set mints-per-user tx-sender (+ user-mints count))
    ;; transfer price
    (if (is-eq total-price u0)
        true 
        (try! (stx-transfer? (* total-price u1000000) tx-sender deployer)))
    (ok true)))

(define-private (mint-iter (tier uint) (context {count: uint, price: uint}))
  (match (element-at price-list-in-stx tier)
    price (let ((new-index (+ u1 (var-get last-index)))
                (mint-count (+ u1 (default-to u0 (map-get? mints-per-tier tier))))
                (mint-limit (default-to u0 (element-at (var-get mint-limits-stx) tier))))
      (asserts! (<= mint-count mint-limit) (begin (print {err: err-sold-out, tier: tier, context: context}) context))
      (map-set mints-per-tier tier mint-count)
      (var-set last-index new-index)
      (match (contract-call? .ryder-nft mint (dickson-4973-permut new-index) tier)
        success {count: (+ u1 (get count context)), price: (+ price (get price context))}
        error (begin (print {error: error, tier: tier, context: context}) context)))
    context))

(define-read-only (get-price-list)
  price-list-in-stx)

(define-read-only (get-mint-limits)
  {stx: (var-get mint-limits-stx), eth: (var-get mint-limits-eth)})

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
    (asserts! (> block-height shuffle-height) err-too-early)
    (var-set mint-active new-state)
    (var-set dickson-parameter (mod (unwrap! (print (get-block-info? time shuffle-height)) err-fatale) MINT-LIMIT))
    (ok new-state)))

(define-public (set-mint-limits (new-limits-stx (list 8 uint)) (new-limits-eth (list 8 uint)))
  (let ((total-stx (fold + new-limits-stx u0))
    (total (fold + new-limits-eth total-stx)))
    (asserts! (is-admin tx-sender) err-not-authorized)
    (asserts! (is-eq total MINT-LIMIT) err-invalid-limits)
    (var-set mint-limits-stx new-limits-stx)
    (var-set mint-limits-eth new-limits-eth)
    (ok true)))

;;
;; calculate dickson permutation with parameter defined by shuffle height
;;
(define-data-var dickson-parameter uint u0)

(define-read-only (dickson-4973-permut (x uint))
  (let ((a (print (var-get dickson-parameter))))
    (mod (+ (pow x u5) (* a (pow x u3)) (* a a x u2984)) MINT-LIMIT)))