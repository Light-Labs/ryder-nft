(define-constant contract-principal (as-contract tx-sender))

(define-constant err-unauthorized (err u403))
(define-constant err-not-allowed (err u508))
(define-constant err-mint-not-live (err u600))
(define-constant err-sold-out (err u601))
(define-constant err-failed (err u602))

(define-data-var mint-enabled bool false)
(define-data-var price-in-ustx uint u1130000000)
(define-data-var payment-recipient principal 'SP1YZSSPWJ5D3S1G48ZPW8NGXVG0K2TZJJXDM6N0Q)

(define-data-var lower-mint-id uint u0)
(define-data-var upper-mint-id uint u0)
(define-data-var last-transferred-id uint u0)

(define-map admins principal bool)
(map-set admins tx-sender true)

(define-map token-mapping uint uint)

(define-private (mint-self-iter (c (buff 1)) (p (optional (response bool uint))))
	(some (contract-call? .ryder-nft mint contract-principal)))

(define-public (mint-self (iterations (buff 200)))
	(begin
		(and (is-eq (var-get lower-mint-id) u0) 
			(var-set lower-mint-id (contract-call? .ryder-nft get-token-id-nonce)))
		(fold mint-self-iter iterations none)
		(ok (var-set upper-mint-id (- (contract-call? .ryder-nft get-token-id-nonce) u1)))))

(define-read-only (get-vrf)
	(unwrap-panic (get-block-info? vrf-seed (- block-height u1))))

(define-private (pick-next-random-token-id (lower-bound uint) (upper-bound uint))
	(begin
		(asserts! (> upper-bound lower-bound) lower-bound)
		(let ((seed (sha256 (concat (get-vrf) (sha256 (var-get last-transferred-id)))))
			(number (+
				(match (element-at seed u0) byte (unwrap-panic (index-of byte-list byte)) u0)
				(match (element-at seed u1) byte (* (unwrap-panic (index-of byte-list byte)) u256) u0)
				(match (element-at seed u2) byte (* (unwrap-panic (index-of byte-list byte)) u65536) u0))))
			(+ lower-bound (mod number (- upper-bound lower-bound))))))

(define-public (claim)
	(let ((upper-bound (var-get upper-mint-id))
		(index (pick-next-random-token-id (var-get lower-mint-id) upper-bound))
		(transfer-id (default-to index (map-get? token-mapping index))))
		(asserts! (var-get mint-enabled) err-mint-not-live)
		(asserts! (> upper-bound u0) err-sold-out)
		(try! (stx-transfer? (var-get price-in-ustx) tx-sender (var-get payment-recipient)))
		(try! (contract-call? .ryder-nft transfer transfer-id contract-principal tx-sender))
		(map-set token-mapping index (default-to upper-bound (map-get? token-mapping upper-bound)))
		(var-set upper-mint-id (- upper-bound u1))
		(ok (var-set last-transferred-id transfer-id))))

(define-public (claim-five)
	(begin
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(claim)))

(define-public (claim-ten)
	(begin
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(try! (claim))
		(claim)))

(define-read-only (get-upper-bound)
	(var-get upper-mint-id))

;; admin function
(define-read-only (check-is-admin)
  (ok (asserts! (default-to false (map-get? admins contract-caller)) err-unauthorized)))

(define-public (set-mint-enabled (enabled bool))
	(begin
		(try! (check-is-admin))
		(ok (var-set mint-enabled enabled))
		))

(define-public (set-admin (new-admin principal) (value bool))
  (begin
    (try! (check-is-admin))
    (asserts! (not (is-eq tx-sender new-admin)) err-not-allowed)
    (ok (map-set admins new-admin value))))

(define-private (burn-top-iter (c (buff 1)) (data {i: uint, p: (response bool uint)}))
	(begin
		(unwrap! (get p data) data)
		{i: (- (get i data) u1), p: (as-contract (contract-call? .ryder-nft burn (get i data)))}))

;; once burn-top is used, mint-self can never be used again
(define-public (burn-top (iterations (buff 200)))
	(let ((result (fold burn-top-iter iterations {i: (var-get upper-mint-id), p: (ok true)})))
		(try! (check-is-admin))
		(unwrap! (get p result) err-failed)
		(ok (var-set upper-mint-id (get i result)))))

(define-public (set-payment-recipient (recipient principal))
  (begin
    (try! (check-is-admin))
    (ok (var-set payment-recipient recipient))))

(define-public (set-price-in-ustx (price uint))
  (begin
    (try! (check-is-admin))
    (ok (var-set price-in-ustx price))))

(define-constant byte-list 0x000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9fa0a1a2a3a4a5a6a7a8a9aaabacadaeafb0b1b2b3b4b5b6b7b8b9babbbcbdbebfc0c1c2c3c4c5c6c7c8c9cacbcccdcecfd0d1d2d3d4d5d6d7d8d9dadbdcdddedfe0e1e2e3e4e5e6e7e8e9eaebecedeeeff0f1f2f3f4f5f6f7f8f9fafbfcfdfeff)
