// Copyright 2023 Harness, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package githook

import (
	"github.com/harness/gitness/app/auth/authz"
	eventsgit "github.com/harness/gitness/app/events/git"
	"github.com/harness/gitness/app/services/protection"
	"github.com/harness/gitness/app/store"
	"github.com/harness/gitness/app/url"

	"github.com/google/wire"
)

// WireSet provides a wire set for this package.
var WireSet = wire.NewSet(
	ProvideController,
)

func ProvideController(
	authorizer authz.Authorizer,
	principalStore store.PrincipalStore,
	repoStore store.RepoStore,
	gitReporter *eventsgit.Reporter,
	pullreqStore store.PullReqStore,
	urlProvider url.Provider,
	protectionManager *protection.Manager,
) *Controller {
	return NewController(
		authorizer,
		principalStore,
		repoStore,
		gitReporter,
		pullreqStore,
		urlProvider,
		protectionManager)
}
