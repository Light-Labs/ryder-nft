;; ryder-mint

(define-map mints-per-user principal uint)
(define-map mint-passes principal uint)

(define-constant ids (shuffle-ids))
(define-data-var last-index uint u0)

(define-public (claim) 
  (mint-many (list 2)))

(define-public (claim-three) (mint-many (list 2 2 2)))

(define-public (claim-five) (mint-many (list 2 2 2 2 2)))

(define-public (claim-ten) (mint-many (list 2 2 2 2 2 2 2 2 2 2)))

(define-public (mint-many (tiers (list 25 uint )))  
  (let 
    (
      ;; mint orders nfts with given tiers
      (summary (fold mint-iter tiers {index: (var-get last-index), price: u0}))
      (index-reached (get index summary))
      (total-price (get total-price summary))   
      (user-mints (get-mints tx-sender))
    )
    (asserts! (or (is-eq (var-get mint-active)) (is-admin tx-sender))
    err-paused)
    (asserts! (<= index-reached (var-get mint-limit)) err-sold-out)
    (map-set mints-per-user tx-sender (+ (len orders) user-mints))
    (var-set last-index (get index-reached summary))
    (if (or (is-admin tx-sender) (is-eq (get total-price summary) u0))    
        (try! (stx-transfer? total-artist tx-sender (var-get artist-address))))        
    (ok (get index-reached summary))))


(define-private (shuffle (i uint) (shuffle-height uint))
  (let ((replaced-id (defaults-to id (map-get? ids i)))
    (i2 (vrf-mod-5000 (get-block-info vrf (- i shuffle-height)))))
    (map-set ids i (defaults-to i2 (map-get? ids i2)))
    (map-set ids i2 replaced-id)))


(define-public (shuffle-ids)
  (begin 
    (asserts! (> block-height shuffle-time))
    (fold shuffle index-5000) (get-block-info vrf shuffle-height)))